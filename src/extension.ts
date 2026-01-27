import * as vscode from 'vscode';
import { QuotaService } from './services/QuotaService';
import { SecretStorageService } from './services/SecretStorageService';
import { LoggingService } from './services/LoggingService';
import { HistoryService } from './services/HistoryService';
import { QuotaStatusBar } from './ui/StatusBar';
import { AccountsProvider } from './ui/AccountsProvider';
import { DetailsView } from './ui/DetailsView';
import { Account, QuotaAdapterConfig } from './models/types';

let intervalHandle: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('OpenCode Quota Monitor is now active!');

    // 1. Init Services
    SecretStorageService.init(context);
    LoggingService.init(context);
    HistoryService.init(context);

    const config = vscode.workspace.getConfiguration('opencodeQuota');
    const ttl = config.get<number>('cacheTTLSeconds', 300);
    const quotaService = new QuotaService(
        ttl,
        LoggingService.instanceRef,
        HistoryService.instanceRef
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
        vscode.commands.registerCommand('opencodeQuota.openDetails', async (item?: any) => {
            if (!item || !item.status) {
                vscode.window.showWarningMessage('Select an account to view details');
                return;
            }
            detailsView.show(item.status);
        })
    );

    // 5. Setup Auto Refresh
    const refreshInterval = config.get<number>('refreshIntervalSeconds', 300) * 1000;
    intervalHandle = setInterval(refresh, refreshInterval);
    
    // Initial fetch
    refresh();
}

export function deactivate() {
    if (intervalHandle) {
        clearInterval(intervalHandle);
    }
}
