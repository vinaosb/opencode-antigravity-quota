import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { Account, OpenCodeAccount, OpenCodeAccountsFile } from '../models/types';
import { LoggingService } from './LoggingService';

export class SecretStorageService {
    private static instance: SecretStorageService;

    private constructor(private secretStorage: vscode.SecretStorage) {}

    private get logger(): LoggingService {
        return LoggingService.instanceRef;
    }

    static init(context: vscode.ExtensionContext): void {
        SecretStorageService.instance = new SecretStorageService(context.secrets);
    }

    static get instanceRef(): SecretStorageService {
        if (!SecretStorageService.instance) {
            throw new Error('SecretStorageService not initialized');
        }
        return SecretStorageService.instance;
    }

    async getSecret(key: string): Promise<string | undefined> {
        return await this.secretStorage.get(key);
    }

    async storeSecret(key: string, value: string): Promise<void> {
        await this.secretStorage.store(key, value);
    }

    async deleteSecret(key: string): Promise<void> {
        await this.secretStorage.delete(key);
    }

    async importOpenCodeAccounts(): Promise<OpenCodeAccount[]> {
        const homeDir = os.homedir();
        let configPath = path.join(homeDir, '.config', 'opencode', 'antigravity-accounts.json');

        // On Windows, it might be in APPDATA
        if (process.platform === 'win32' && process.env.APPDATA) {
            configPath = path.join(process.env.APPDATA, 'opencode', 'antigravity-accounts.json');
        }

        try {
            const fs = await import('fs/promises');
            const fileContent = await fs.readFile(configPath, 'utf-8');
            const parsed = JSON.parse(fileContent) as OpenCodeAccountsFile;
            return parsed.accounts || [];
        } catch (error) {
            if ((error as any).code === 'ENOENT') {
                this.logger.logInfo('OpenCode accounts file not found at: ' + configPath);
                return [];
            }
            this.logger.logError('Failed to read OpenCode accounts file', error);
            return [];
        }
    }

    async importFromOpenCode(openCodeAccounts: OpenCodeAccount[]): Promise<Account[]> {
        const importedAccounts: Account[] = [];

        for (const ocAccount of openCodeAccounts) {
            const name = `OpenCode: ${ocAccount.email}`;
            const tokenSecretName = `opencode_${ocAccount.email.replace(/[@.]/g, '_')}`;
            await this.storeSecret(tokenSecretName, ocAccount.refreshToken);

            const newAccount: Account = {
                name,
                type: 'oauth',
                tokenSecretName,
                endpoint: 'https://cloudcode-pa.sandbox.googleapis.com/v1internal:fetchAvailableModels'
            };

            importedAccounts.push(newAccount);
        }

        return importedAccounts;
    }
}
