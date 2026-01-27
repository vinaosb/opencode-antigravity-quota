import * as vscode from 'vscode';
import { QuotaService } from './services/QuotaService';
import { SecretStorageService } from './services/SecretStorageService';
import { LoggingService } from './services/LoggingService';
import { HistoryService } from './services/HistoryService';
import { QuotaStatusBar } from './ui/StatusBar';
import { AccountsProvider } from './ui/AccountsProvider';
import { DetailsView } from './ui/DetailsView';
import { Account, QuotaAdapterConfig, BackoffConfig } from './models/types';

let intervalHandle: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('OpenCode Quota Monitor is now active!');

    // 1. Init Services
    SecretStorageService.init(context);
    LoggingService.init(context);
    HistoryService.init(context);

    const config = vscode.workspace.getConfiguration('opencodeQuota');
    const ttl = config.get<number>('cacheTTLSeconds', 300);
    const httpTimeoutMs = config.get<number>('httpTimeoutMs', 30000);
    
    const backoffConfig: BackoffConfig = {
        baseDelayMs: config.get<number>('backoff.baseDelayMs', 10000),
        multiplier: config.get<number>('backoff.multiplier', 2),
        maxDelayMs: config.get<number>('backoff.maxDelayMs', 300000),
        maxRetries: config.get<number>('backoff.maxRetries', 8),
        errorCacheSeconds: config.get<number>('backoff.errorCacheSeconds', 30)
    };

    const quotaService = new QuotaService(
        ttl,
        LoggingService.instanceRef,
        HistoryService.instanceRef,
        backoffConfig,
        httpTimeoutMs
    );
    context.subscriptions.push(quotaService);

    // 2. Init UI
    const statusBar = new QuotaStatusBar();
    const accountsProvider = new AccountsProvider();
    vscode.window.registerTreeDataProvider('opencodeQuotaAccounts', accountsProvider);

    const detailsView = new DetailsView(
        context.extensionUri,
        accountsProvider,
        HistoryService.instanceRef
    );

    context.subscriptions.push(statusBar);
    context.subscriptions.push(detailsView);

    // 3. Helper to refresh logic
    const refresh = async () => {
        const currentConfig = vscode.workspace.getConfiguration('opencodeQuota');
        const accounts = currentConfig.get<Account[]>('accounts', []);
        const adapterConfig = currentConfig.get<QuotaAdapterConfig>('adapterConfig', {});
        const maxConcurrent = currentConfig.get<number>('maxConcurrentRequests', 3);

        if (accounts.length === 0) {
            statusBar.update([]);
            accountsProvider.refresh([]);
            return;
        }

        const statuses = await quotaService.fetchAll(accounts, adapterConfig, maxConcurrent);
        statusBar.update(statuses);
        accountsProvider.refresh(statuses);
    };

    // 4. Register Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('opencodeQuota.refresh', () => {
            refresh();
            vscode.window.showInformationMessage('Quota refreshed.');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('opencodeQuota.addAccount', async () => {
            const name = await vscode.window.showInputBox({ prompt: 'Account Name' });
            if (!name) return;

            const endpoint = await vscode.window.showInputBox({ prompt: 'Quota API Endpoint URL' });
            if (!endpoint) return;

            const token = await vscode.window.showInputBox({ prompt: 'API Token', password: true });
            if (!token) return;

            const tokenSecretName = `opencode.token.${Date.now()}`;
            await SecretStorageService.instanceRef.storeSecret(tokenSecretName, token);

            const newAccount: Account = {
                name,
                type: 'token',
                tokenSecretName,
                endpoint
            };

            const config = vscode.workspace.getConfiguration('opencodeQuota');
            const accounts = config.get<Account[]>('accounts', []);
            await config.update('accounts', [...accounts, newAccount], vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage(`Account ${name} added.`);
            refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('opencodeQuota.removeAccount', async () => {
             const config = vscode.workspace.getConfiguration('opencodeQuota');
             const accounts = config.get<Account[]>('accounts', []);
             
             const selected = await vscode.window.showQuickPick(accounts.map(a => a.name), { placeHolder: 'Select account to remove' });
             if (!selected) return;

             const accountToRemove = accounts.find(a => a.name === selected);
             if (accountToRemove) {
                 await SecretStorageService.instanceRef.deleteSecret(accountToRemove.tokenSecretName);
                 const newAccounts = accounts.filter(a => a.name !== selected);
                 await config.update('accounts', newAccounts, vscode.ConfigurationTarget.Global);
                 vscode.window.showInformationMessage(`Account ${selected} removed.`);
                 refresh();
             }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('opencodeQuota.editAccount', async () => {
            const config = vscode.workspace.getConfiguration('opencodeQuota');
            const accounts = config.get<Account[]>('accounts', []);

            if (accounts.length === 0) {
                vscode.window.showWarningMessage('No accounts to edit.');
                return;
            }

            const selectedName = await vscode.window.showQuickPick(accounts.map(a => a.name), { placeHolder: 'Select account to edit' });
            if (!selectedName) return;

            const account = accounts.find(a => a.name === selectedName);
            if (!account) return;

            const name = await vscode.window.showInputBox({ 
                prompt: 'Edit Account Name',
                value: account.name,
                validateInput: (value) => {
                    if (!value || value.trim() === '') {
                        return 'Account name cannot be empty';
                    }
                    return null;
                }
            });
            if (!name) return;

            const token = await vscode.window.showInputBox({ 
                prompt: 'Edit API Token (leave empty to keep current)', 
                password: true,
                validateInput: (value) => {
                    if (value && value.trim() === '') {
                        return 'Token cannot be empty if provided';
                    }
                    return null;
                }
            });
            
            // Note: token === undefined means user cancelled. token === '' means keep current.
            if (token === undefined) return;

            const updatedAccounts = accounts.map(a => {
                if (a.name === selectedName) {
                    return { ...a, name: name.trim() };
                }
                return a;
            });

            if (token.trim() !== '') {
                await SecretStorageService.instanceRef.storeSecret(account.tokenSecretName, token.trim());
            }

            await config.update('accounts', updatedAccounts, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Account ${name} updated.`);
            refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('opencodeQuota.importFromOpenCode', async () => {
            const secretStorageService = SecretStorageService.instanceRef;
            const openCodeAccounts = await secretStorageService.importOpenCodeAccounts();

            if (openCodeAccounts.length === 0) {
                vscode.window.showInformationMessage(
                    'No OpenCode accounts found. Make sure the antigravity-auth plugin is installed and has accounts configured.',
                    'OK'
                );
                return;
            }

            const confirm = await vscode.window.showQuickPick(
                [{ label: `Import ${openCodeAccounts.length} accounts`, description: 'From OpenCode antigravity-auth' }],
                { placeHolder: 'Confirm import' }
            );

            if (!confirm) {
                return;
            }

            const imported = await secretStorageService.importFromOpenCode(openCodeAccounts);
            const currentConfig = vscode.workspace.getConfiguration('opencodeQuota');
            const existingAccounts = currentConfig.get<Account[]>('accounts', []);
            
            // Avoid adding accounts if they already exist with same name
            const newAccounts = [...existingAccounts];
            for (const imp of imported) {
                if (!newAccounts.some(a => a.name === imp.name)) {
                    newAccounts.push(imp);
                }
            }

            await currentConfig.update('accounts', newAccounts, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage(`Successfully imported ${imported.length} accounts from OpenCode.`, 'OK');
            LoggingService.instanceRef.logInfo(`Imported ${imported.length} OpenCode accounts: ${imported.map(a => a.name).join(', ')}`);
            refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('opencodeQuota.openDetails', async (item?: any) => {
            if (!item || !item.status) {
                vscode.window.showWarningMessage('Select an account to view details');
                return;
            }
            detailsView.show(item.status);
        })
    );

    // 5. Setup Auto Refresh
    let pollIntervalMs = config.get<number>('pollIntervalMs', 300000);

    // Backward compatibility for refreshIntervalSeconds if pollIntervalMs is at default
    if (pollIntervalMs === 300000) {
        const refreshIntervalSeconds = config.get<number>('refreshIntervalSeconds', 300);
        if (refreshIntervalSeconds !== 300) {
            pollIntervalMs = refreshIntervalSeconds * 1000;
        }
    }

    // Validate minimum
    if (pollIntervalMs < 60000) {
        LoggingService.instanceRef.logInfo(`WARNING: Polling interval ${pollIntervalMs}ms is below minimum 60s. Using 60s instead.`);
        pollIntervalMs = 60000;
    }

    intervalHandle = setInterval(refresh, pollIntervalMs);
    
    // Initial fetch
    refresh();
}

export function deactivate() {
    if (intervalHandle) {
        clearInterval(intervalHandle);
    }
}
