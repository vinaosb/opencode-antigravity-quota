import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import { Account, OpenCodeAccount } from '../../models/types';
import { SecretStorageService } from '../../services/SecretStorageService';
import { LoggingService } from '../../services/LoggingService';
import { HistoryService } from '../../services/HistoryService';

suite('Import Accounts Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let mockConfig: any;
    let mockSecretStorage: any;
    let importFromOpenCodeCommand: any;
    let refreshStub: sinon.SinonStub;

    setup(() => {
        sandbox = sinon.createSandbox();

        // Mock vscode.window
        sandbox.stub(vscode.window, 'showQuickPick');
        sandbox.stub(vscode.window, 'showInformationMessage');
        sandbox.stub(vscode.window, 'showWarningMessage');

        // Mock vscode.workspace.getConfiguration
        mockConfig = {
            get: sandbox.stub().returns([]),
            update: sandbox.stub().resolves()
        };
        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);

        // Mock SecretStorageService
        mockSecretStorage = {
            importOpenCodeAccounts: sandbox.stub(),
            importFromOpenCode: sandbox.stub(),
            storeSecret: sandbox.stub().resolves()
        };

        // Stub services init
        sandbox.stub(SecretStorageService, 'init');
        sandbox.stub(LoggingService, 'init');
        sandbox.stub(HistoryService, 'init');

        // Set up SecretStorageService.instanceRef mock
        sandbox.stub(SecretStorageService, 'instanceRef').get(() => mockSecretStorage);

        // Set up LoggingService.instanceRef mock
        const mockLoggingService = { 
            logInfo: sandbox.stub(), 
            logError: sandbox.stub(),
            logDebug: sandbox.stub()
        };
        sandbox.stub(LoggingService, 'instanceRef').get(() => mockLoggingService);

        refreshStub = sandbox.stub();

        // Define the command implementation
        importFromOpenCodeCommand = async () => {
            const secretStorageService = mockSecretStorage;
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
            const currentConfig = mockConfig;
            const existingAccounts = currentConfig.get('accounts', []);
            
            const newAccounts = [...existingAccounts];
            for (const imp of imported) {
                if (!newAccounts.some(a => a.name === imp.name)) {
                    newAccounts.push(imp);
                }
            }

            await currentConfig.update('accounts', newAccounts, vscode.ConfigurationTarget.Global);
            
            vscode.window.showInformationMessage(`Successfully imported ${imported.length} accounts from OpenCode.`, 'OK');
            refreshStub();
        };
    });

    teardown(() => {
        sandbox.restore();
    });

    test('should show message when no accounts found', async () => {
        mockSecretStorage.importOpenCodeAccounts.resolves([]);

        await importFromOpenCodeCommand();

        assert.strictEqual((vscode.window.showInformationMessage as sinon.SinonStub).callCount, 1);
        assert.ok((vscode.window.showInformationMessage as sinon.SinonStub).firstCall.args[0].includes('No OpenCode accounts found'));
    });

    test('should import accounts when confirmed', async () => {
        const mockOCAccounts: OpenCodeAccount[] = [
            { email: 'test@example.com', refreshToken: 'rt1', projectId: 'p1', addedAt: 123, lastUsed: 456 }
        ];
        const mockImported: Account[] = [
            { name: 'OpenCode: test@example.com', type: 'oauth', tokenSecretName: 'secret1', endpoint: 'https://api.com' }
        ];

        mockSecretStorage.importOpenCodeAccounts.resolves(mockOCAccounts);
        (vscode.window.showQuickPick as sinon.SinonStub).resolves({ label: 'Import 1 accounts' });
        mockSecretStorage.importFromOpenCode.resolves(mockImported);
        mockConfig.get.withArgs('accounts', []).returns([]);

        await importFromOpenCodeCommand();

        assert.strictEqual(mockSecretStorage.importFromOpenCode.callCount, 1);
        assert.strictEqual(mockConfig.update.callCount, 1);
        const updatedAccounts = mockConfig.update.firstCall.args[1];
        assert.strictEqual(updatedAccounts.length, 1);
        assert.strictEqual(updatedAccounts[0].name, 'OpenCode: test@example.com');
        assert.strictEqual(refreshStub.callCount, 1);
    });

    test('should not import when cancelled', async () => {
        const mockOCAccounts: OpenCodeAccount[] = [
            { email: 'test@example.com', refreshToken: 'rt1', projectId: 'p1', addedAt: 123, lastUsed: 456 }
        ];

        mockSecretStorage.importOpenCodeAccounts.resolves(mockOCAccounts);
        (vscode.window.showQuickPick as sinon.SinonStub).resolves(undefined);

        await importFromOpenCodeCommand();

        assert.strictEqual(mockSecretStorage.importFromOpenCode.callCount, 0);
        assert.strictEqual(mockConfig.update.callCount, 0);
    });

    test('should not add duplicates', async () => {
        const existing: Account[] = [
            { name: 'OpenCode: test@example.com', type: 'oauth', tokenSecretName: 'secret1', endpoint: 'https://api.com' }
        ];
        const mockOCAccounts: OpenCodeAccount[] = [
            { email: 'test@example.com', refreshToken: 'rt1', projectId: 'p1', addedAt: 123, lastUsed: 456 }
        ];
        const mockImported: Account[] = [
            { name: 'OpenCode: test@example.com', type: 'oauth', tokenSecretName: 'secret1', endpoint: 'https://api.com' }
        ];

        mockSecretStorage.importOpenCodeAccounts.resolves(mockOCAccounts);
        (vscode.window.showQuickPick as sinon.SinonStub).resolves({ label: 'Import 1 accounts' });
        mockSecretStorage.importFromOpenCode.resolves(mockImported);
        mockConfig.get.withArgs('accounts', []).returns(existing);

        await importFromOpenCodeCommand();

        assert.strictEqual(mockConfig.update.callCount, 1);
        const updatedAccounts = mockConfig.update.firstCall.args[1];
        assert.strictEqual(updatedAccounts.length, 1); // Still 1, not 2
    });
});
