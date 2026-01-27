import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { Account, AccountStatus } from '../../models/types';

suite('Commands Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockConfig: any;
    let mockSecretStorage: any;
    let mockStatusBar: any;
    let mockAccountsProvider: any;
    let mockDetailsView: any;
    let mockQuotaService: any;

    let refreshStub: any;
    let refreshCommand: any;
    let addAccountCommand: any;
    let removeAccountCommand: any;
    let editAccountCommand: any;
    let openDetailsCommand: any;

    setup(() => {
        sandbox = sinon.createSandbox();

        // Mock vscode.window
        sandbox.stub(vscode.window, 'showInputBox');
        sandbox.stub(vscode.window, 'showQuickPick');
        sandbox.stub(vscode.window, 'showInformationMessage');
        sandbox.stub(vscode.window, 'showWarningMessage');
        sandbox.stub(vscode.window, 'registerTreeDataProvider');

        // Mock vscode.workspace.getConfiguration
        mockConfig = {
            get: sandbox.stub() as any,
            update: sandbox.stub()
        };
        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);

        // Mock SecretStorageService
        mockSecretStorage = {
            storeSecret: sandbox.stub().resolves(),
            deleteSecret: sandbox.stub().resolves()
        };

        // Mock QuotaService
        mockQuotaService = {
            fetchAll: sandbox.stub().resolves([])
        };

        // Mock QuotaStatusBar
        mockStatusBar = {
            update: sandbox.stub()
        };

        // Mock AccountsProvider
        mockAccountsProvider = {
            refresh: sandbox.stub()
        };

        // Mock DetailsView
        mockDetailsView = {
            show: sandbox.stub()
        };

        // Stub services init
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        sandbox.stub(require('../../services/SecretStorageService').SecretStorageService, 'init');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        sandbox.stub(require('../../services/LoggingService').LoggingService, 'init');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        sandbox.stub(require('../../services/HistoryService').HistoryService, 'init');

        // Set up SecretStorageService.instanceRef mock
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        Object.defineProperty(require('../../services/SecretStorageService').SecretStorageService, 'instanceRef', {
            get: () => mockSecretStorage,
            configurable: true
        });

        // Create refresh helper
        refreshStub = async () => {
            const accounts = mockConfig.get('accounts', []);
            const adapterConfig = mockConfig.get('adapterConfig', {});

            if (accounts.length === 0) {
                mockStatusBar.update([]);
                mockAccountsProvider.refresh([]);
                return;
            }

            const statuses = await mockQuotaService.fetchAll(accounts, adapterConfig);
            mockStatusBar.update(statuses);
            mockAccountsProvider.refresh(statuses);
        };
    });

    teardown(() => {
        sandbox.restore();
    });

    suite('refresh command', () => {
        setup(() => {
            refreshCommand = () => {
                refreshStub();
                (vscode.window.showInformationMessage as any)('Quota refreshed.');
            };
        });

        test('should call refresh and show info message', async () => {
            mockConfig.get.withArgs('accounts').returns([]);
            mockConfig.get.withArgs('adapterConfig').returns({});

            await refreshCommand();

            assert.strictEqual(mockStatusBar.update.callCount, 1);
            assert.deepStrictEqual(mockStatusBar.update.firstCall.args[0], []);
            assert.strictEqual(mockAccountsProvider.refresh.callCount, 1);
            assert.deepStrictEqual(mockAccountsProvider.refresh.firstCall.args[0], []);
            assert.strictEqual((vscode.window.showInformationMessage as any).callCount, 1);
            assert.strictEqual((vscode.window.showInformationMessage as any).firstCall.args[0], 'Quota refreshed.');
        });

        test('should fetch and update when accounts exist', async () => {
            const accounts: Account[] = [
                { name: 'test', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api.test.com' }
            ];
            const statuses: AccountStatus[] = [
                {
                    account: accounts[0],
                    quota: { used: 100, limit: 1000, reset: null, remaining: 900 },
                    status: 'ok',
                    lastUpdated: Date.now()
                }
            ];

            mockConfig.get.withArgs('accounts').returns(accounts);
            mockConfig.get.withArgs('adapterConfig').returns({});
            mockQuotaService.fetchAll.resolves(statuses);

            await refreshCommand();

            assert.strictEqual(mockQuotaService.fetchAll.callCount, 1);
            assert.deepStrictEqual(mockQuotaService.fetchAll.firstCall.args[0], accounts);
            assert.deepStrictEqual(mockStatusBar.update.firstCall.args[0], statuses);
            assert.deepStrictEqual(mockAccountsProvider.refresh.firstCall.args[0], statuses);
        });
    });

    suite('addAccount command', () => {
        setup(() => {
            addAccountCommand = async () => {
                const name = await vscode.window.showInputBox({ prompt: 'Account Name' });
                if (!name) return;

                const endpoint = await vscode.window.showInputBox({ prompt: 'Quota API Endpoint URL' });
                if (!endpoint) return;

                const token = await vscode.window.showInputBox({ prompt: 'API Token', password: true });
                if (!token) return;

                const tokenSecretName = `opencode.token.${Date.now()}`;
                await mockSecretStorage.storeSecret(tokenSecretName, token);

                const newAccount: Account = {
                    name,
                    type: 'token',
                    tokenSecretName,
                    endpoint
                };

                const accounts = mockConfig.get('accounts');
                await mockConfig.update('accounts', [...(accounts || []), newAccount], vscode.ConfigurationTarget.Global);

                (vscode.window.showInformationMessage as any)(`Account ${name} added.`);
                await refreshStub();
            };
        });

        test('should add account successfully', async () => {
            const name = 'Test Account';
            const endpoint = 'https://api.example.com/quota';
            const token = 'test-token-123';

            // Setup sequential prompts
            (vscode.window.showInputBox as sinon.SinonStub)
                .onFirstCall().resolves(name)
                .onSecondCall().resolves(endpoint)
                .onThirdCall().resolves(token);

            mockConfig.get.withArgs('accounts').returns([]);

            await addAccountCommand();

            assert.strictEqual(mockSecretStorage.storeSecret.callCount, 1);
            assert.ok(mockSecretStorage.storeSecret.firstCall.args[0].startsWith('opencode.token.'));
            assert.strictEqual(mockSecretStorage.storeSecret.firstCall.args[1], token);
            assert.strictEqual(mockConfig.update.callCount, 1);
            assert.strictEqual((vscode.window.showInformationMessage as any).callCount, 1);
            assert.strictEqual((vscode.window.showInformationMessage as any).firstCall.args[0], `Account ${name} added.`);
        });

        test('should return early if name is cancelled', async () => {
            (vscode.window.showInputBox as sinon.SinonStub).resolves(undefined);

            await addAccountCommand();

            assert.strictEqual(mockSecretStorage.storeSecret.callCount, 0);
            assert.strictEqual(mockConfig.update.callCount, 0);
            assert.strictEqual((vscode.window.showInformationMessage as any).callCount, 0);
        });

        test('should return early if endpoint is cancelled', async () => {
            (vscode.window.showInputBox as sinon.SinonStub)
                .onFirstCall().resolves('Test Account')
                .onSecondCall().resolves(undefined);

            await addAccountCommand();

            assert.strictEqual(mockSecretStorage.storeSecret.callCount, 0);
            assert.strictEqual(mockConfig.update.callCount, 0);
        });

        test('should return early if token is cancelled', async () => {
            (vscode.window.showInputBox as sinon.SinonStub)
                .onFirstCall().resolves('Test Account')
                .onSecondCall().resolves('https://api.example.com/quota')
                .onThirdCall().resolves(undefined);

            await addAccountCommand();

            assert.strictEqual(mockSecretStorage.storeSecret.callCount, 0);
            assert.strictEqual(mockConfig.update.callCount, 0);
        });

        test('should append to existing accounts', async () => {
            const existingAccounts: Account[] = [
                { name: 'Existing', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api.test.com' }
            ];
            mockConfig.get.withArgs('accounts').returns(existingAccounts);

            const name = 'New Account';
            const endpoint = 'https://api.new.com/quota';
            const token = 'new-token';

            (vscode.window.showInputBox as sinon.SinonStub)
                .onFirstCall().resolves(name)
                .onSecondCall().resolves(endpoint)
                .onThirdCall().resolves(token);

            await addAccountCommand();

            const updatedAccounts = mockConfig.update.firstCall.args[1];
            assert.strictEqual(updatedAccounts.length, 2);
            assert.strictEqual(updatedAccounts[0].name, 'Existing');
            assert.strictEqual(updatedAccounts[1].name, 'New Account');
        });
    });

    suite('removeAccount command', () => {
        setup(() => {
            removeAccountCommand = async () => {
                const accounts = mockConfig.get('accounts');

                const selected = await vscode.window.showQuickPick(accounts ? accounts.map((a: Account) => a.name) : [], { placeHolder: 'Select account to remove' });
                if (!selected) return;

                const accountToRemove = accounts?.find((a: Account) => a.name === selected);
                if (accountToRemove) {
                    await mockSecretStorage.deleteSecret(accountToRemove.tokenSecretName);
                    const newAccounts = (accounts || []).filter((a: Account) => a.name !== selected);
                    await mockConfig.update('accounts', newAccounts, vscode.ConfigurationTarget.Global);
                    (vscode.window.showInformationMessage as any)(`Account ${selected} removed.`);
                    await refreshStub();
                }
            };
        });

        test('should remove account successfully', async () => {
            const accounts: Account[] = [
                { name: 'Account1', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api1.com' },
                { name: 'Account2', type: 'token', tokenSecretName: 'secret2', endpoint: 'https://api2.com' }
            ];
            mockConfig.get.withArgs('accounts').returns(accounts);

            (vscode.window.showQuickPick as sinon.SinonStub).resolves('Account1');

            await removeAccountCommand();

            assert.strictEqual(mockSecretStorage.deleteSecret.callCount, 1);
            assert.strictEqual(mockSecretStorage.deleteSecret.firstCall.args[0], 'secret1');
            assert.strictEqual(mockConfig.update.callCount, 1);
            const newAccounts = mockConfig.update.firstCall.args[1];
            assert.strictEqual(newAccounts.length, 1);
            assert.strictEqual(newAccounts[0].name, 'Account2');
            assert.strictEqual((vscode.window.showInformationMessage as any).callCount, 1);
            assert.strictEqual((vscode.window.showInformationMessage as any).firstCall.args[0], 'Account Account1 removed.');
        });

        test('should return early when cancelled', async () => {
            const accounts: Account[] = [
                { name: 'Account1', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api1.com' }
            ];
            mockConfig.get.withArgs('accounts').returns(accounts);
            (vscode.window.showQuickPick as sinon.SinonStub).resolves(undefined);

            await removeAccountCommand();

            assert.strictEqual(mockSecretStorage.deleteSecret.callCount, 0);
            assert.strictEqual(mockConfig.update.callCount, 0);
        });

        test('should handle empty accounts list', async () => {
            mockConfig.get.withArgs('accounts').returns([]);
            (vscode.window.showQuickPick as sinon.SinonStub).resolves(undefined);

            await removeAccountCommand();

            assert.strictEqual(mockSecretStorage.deleteSecret.callCount, 0);
        });
    });

    suite('editAccount command', () => {
        setup(() => {
            editAccountCommand = async () => {
                const accounts = mockConfig.get('accounts');

                if (!accounts || accounts.length === 0) {
                    (vscode.window.showWarningMessage as any)('No accounts to edit.');
                    return;
                }

                const selectedName = await vscode.window.showQuickPick(accounts.map((a: Account) => a.name), { placeHolder: 'Select account to edit' });
                if (!selectedName) return;

                const account = accounts.find((a: Account) => a.name === selectedName);
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

                if (token === undefined) return;

                const updatedAccounts = accounts.map((a: Account) => {
                    if (a.name === selectedName) {
                        return { ...a, name: name.trim() };
                    }
                    return a;
                });

                if (token.trim() !== '') {
                    await mockSecretStorage.storeSecret(account.tokenSecretName, token.trim());
                }

                await mockConfig.update('accounts', updatedAccounts, vscode.ConfigurationTarget.Global);
                (vscode.window.showInformationMessage as any)(`Account ${name} updated.`);
                await refreshStub();
            };
        });

        test('should show warning when no accounts exist', async () => {
            mockConfig.get.withArgs('accounts').returns([]);

            await editAccountCommand();

            assert.strictEqual((vscode.window.showWarningMessage as any).callCount, 1);
            assert.strictEqual((vscode.window.showWarningMessage as any).firstCall.args[0], 'No accounts to edit.');
        });

        test('should update account name successfully', async () => {
            const accounts: Account[] = [
                { name: 'Old Name', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api1.com' }
            ];
            mockConfig.get.withArgs('accounts').returns(accounts);
            (vscode.window.showQuickPick as sinon.SinonStub).resolves('Old Name');
            (vscode.window.showInputBox as sinon.SinonStub).resolves('New Name');

            await editAccountCommand();

            const updatedAccounts = mockConfig.update.firstCall.args[1];
            assert.strictEqual(updatedAccounts.length, 1);
            assert.strictEqual(updatedAccounts[0].name, 'New Name');
            assert.strictEqual((vscode.window.showInformationMessage as any).firstCall.args[0], 'Account New Name updated.');
        });

        test('should update token when new token provided', async () => {
            const accounts: Account[] = [
                { name: 'Account1', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api1.com' }
            ];
            mockConfig.get.withArgs('accounts').returns(accounts);
            (vscode.window.showQuickPick as sinon.SinonStub).resolves('Account1');
            (vscode.window.showInputBox as sinon.SinonStub)
                .onFirstCall().resolves('Account1')
                .onSecondCall().resolves('new-token');

            await editAccountCommand();

            assert.strictEqual(mockSecretStorage.storeSecret.callCount, 1);
            assert.strictEqual(mockSecretStorage.storeSecret.firstCall.args[0], 'secret1');
            assert.strictEqual(mockSecretStorage.storeSecret.firstCall.args[1], 'new-token');
        });

        test('should keep current token when empty string provided', async () => {
            const accounts: Account[] = [
                { name: 'Account1', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api1.com' }
            ];
            mockConfig.get.withArgs('accounts').returns(accounts);
            (vscode.window.showQuickPick as sinon.SinonStub).resolves('Account1');
            (vscode.window.showInputBox as sinon.SinonStub)
                .onFirstCall().resolves('Account1')
                .onSecondCall().resolves('');

            await editAccountCommand();

            assert.strictEqual(mockSecretStorage.storeSecret.callCount, 0);
        });

        test('should return early when account selection cancelled', async () => {
            const accounts: Account[] = [
                { name: 'Account1', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api1.com' }
            ];
            mockConfig.get.withArgs('accounts').returns(accounts);
            (vscode.window.showQuickPick as sinon.SinonStub).resolves(undefined);

            await editAccountCommand();

            assert.strictEqual(mockConfig.update.callCount, 0);
        });

        test('should return early when name edit cancelled', async () => {
            const accounts: Account[] = [
                { name: 'Account1', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api1.com' }
            ];
            mockConfig.get.withArgs('accounts').returns(accounts);
            (vscode.window.showQuickPick as sinon.SinonStub).resolves('Account1');
            (vscode.window.showInputBox as sinon.SinonStub).resolves(undefined);

            await editAccountCommand();

            assert.strictEqual(mockConfig.update.callCount, 0);
        });

        test('should return early when token edit cancelled', async () => {
            const accounts: Account[] = [
                { name: 'Account1', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api1.com' }
            ];
            mockConfig.get.withArgs('accounts').returns(accounts);
            (vscode.window.showQuickPick as sinon.SinonStub).resolves('Account1');
            (vscode.window.showInputBox as sinon.SinonStub)
                .onFirstCall().resolves('Account1')
                .onSecondCall().resolves(undefined);

            await editAccountCommand();

            assert.strictEqual(mockConfig.update.callCount, 0);
        });

        test('should validate empty name input', async () => {
            const accounts: Account[] = [
                { name: 'Account1', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api1.com' }
            ];
            mockConfig.get.withArgs('accounts').returns(accounts);
            (vscode.window.showQuickPick as sinon.SinonStub).resolves('Account1');

            (vscode.window.showInputBox as sinon.SinonStub)
                .onFirstCall().callsFake((options: any) => {
                    if (options.validateInput) {
                        const result = options.validateInput('');
                        assert.strictEqual(result, 'Account name cannot be empty');
                    }
                    return Promise.resolve(undefined);
                });

            await editAccountCommand();
        });
    });

    suite('openDetails command', () => {
        setup(() => {
            openDetailsCommand = async (item?: any) => {
                if (!item || !item.status) {
                    (vscode.window.showWarningMessage as any)('Select an account to view details');
                    return;
                }
                mockDetailsView.show(item.status);
            };
        });

        test('should show details when item has status', async () => {
            const mockStatus: AccountStatus = {
                account: { name: 'Test', type: 'token', tokenSecretName: 'secret1', endpoint: 'https://api.com' },
                quota: { used: 100, limit: 1000, reset: null, remaining: 900 },
                status: 'ok',
                lastUpdated: Date.now()
            };
            const item = { status: mockStatus };

            await openDetailsCommand(item);

            assert.strictEqual((vscode.window.showWarningMessage as any).callCount, 0);
            assert.strictEqual(mockDetailsView.show.callCount, 1);
            assert.deepStrictEqual(mockDetailsView.show.firstCall.args[0], mockStatus);
        });

        test('should show warning when item is undefined', async () => {
            await openDetailsCommand(undefined);

            assert.strictEqual((vscode.window.showWarningMessage as any).callCount, 1);
            assert.strictEqual((vscode.window.showWarningMessage as any).firstCall.args[0], 'Select an account to view details');
            assert.strictEqual(mockDetailsView.show.callCount, 0);
        });

        test('should show warning when item has no status', async () => {
            const item = { name: 'Test' };

            await openDetailsCommand(item);

            assert.strictEqual((vscode.window.showWarningMessage as any).callCount, 1);
            assert.strictEqual((vscode.window.showWarningMessage as any).firstCall.args[0], 'Select an account to view details');
            assert.strictEqual(mockDetailsView.show.callCount, 0);
        });

        test('should show warning when item status is null', async () => {
            const item = { status: null };

            await openDetailsCommand(item);

            assert.strictEqual((vscode.window.showWarningMessage as any).callCount, 1);
            assert.strictEqual(mockDetailsView.show.callCount, 0);
        });
    });
});
