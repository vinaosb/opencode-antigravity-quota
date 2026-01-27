import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import axios from 'axios';
import { QuotaService } from '../../services/QuotaService';
import { HistoryService } from '../../services/HistoryService';
import { LoggingService } from '../../services/LoggingService';
import { SecretStorageService } from '../../services/SecretStorageService';
import { QuotaStatusBar } from '../../ui/StatusBar';
import { AccountsProvider } from '../../ui/AccountsProvider';
import { DetailsView } from '../../ui/DetailsView';
import { Account, AccountStatus, QuotaAdapterConfig } from '../../models/types';

suite('Integration Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let quotaService: QuotaService;
    let statusBar: QuotaStatusBar;
    let accountsProvider: AccountsProvider;
    let detailsView: DetailsView;
    let historyServiceMock: any;
    let loggingServiceMock: any;
    let secretStorageMock: any;
    let mockContext: any;
    let mockConfig: any;
    let axiosGetStub: sinon.SinonStub;

    const defaultAdapterConfig: QuotaAdapterConfig = {};

    setup(() => {
        sandbox = sinon.createSandbox();
        
        mockContext = {
            secrets: { get: sandbox.stub(), store: sandbox.stub(), delete: sandbox.stub() },
            globalState: { get: sandbox.stub(), update: sandbox.stub() },
            subscriptions: []
        };

        historyServiceMock = { addHistoryPoint: sandbox.stub().resolves(), getHistory: sandbox.stub().returns([]) };
        sandbox.stub(HistoryService, 'instanceRef').get(() => historyServiceMock);

        loggingServiceMock = { logInfo: sandbox.stub(), logDebug: sandbox.stub(), logError: sandbox.stub() };
        sandbox.stub(LoggingService, 'instanceRef').get(() => loggingServiceMock);

        secretStorageMock = { getSecret: sandbox.stub().resolves('test-token'), storeSecret: sandbox.stub().resolves(), deleteSecret: sandbox.stub().resolves() };
        sandbox.stub(SecretStorageService, 'instanceRef').get(() => secretStorageMock);

        mockConfig = {
            get: sandbox.stub().callsFake((key: string, defaultValue: any) => {
                if (key === 'accounts') return [];
                if (key === 'adapterConfig') return {};
                if (key === 'cacheTTLSeconds') return 300;
                if (key === 'refreshIntervalSeconds') return 300;
                return defaultValue;
            }),
            update: sandbox.stub().resolves()
        };
        sandbox.stub(vscode.workspace, 'getConfiguration').returns(mockConfig);

        sandbox.stub(vscode.window, 'showInformationMessage').resolves();
        sandbox.stub(vscode.window, 'showWarningMessage').resolves();
        sandbox.stub(vscode.window, 'showErrorMessage').resolves();
        sandbox.stub(vscode.window, 'registerTreeDataProvider').returnsArg(1);

        const mockStatusBarItem: any = {
            id: 'mock-status-bar', alignment: vscode.StatusBarAlignment.Left, priority: 100,
            text: '', show: sandbox.stub(), hide: sandbox.stub(), dispose: sandbox.stub()
        };
        sandbox.stub(vscode.window, 'createStatusBarItem').returns(mockStatusBarItem);

        const mockWebviewPanel = {
            webview: { html: '', asWebviewUri: sandbox.stub().returnsArg(0), cspSource: 'vscode-resource://' },
            onDidDispose: sandbox.stub(), reveal: sandbox.stub(), dispose: sandbox.stub()
        };
        sandbox.stub(vscode.window, 'createWebviewPanel').returns(mockWebviewPanel as any);

        sandbox.stub(vscode.Uri, 'joinPath').callsFake((_base: vscode.Uri, ...paths: string[]) => {
            return { fsPath: paths.join('/'), toString: () => paths.join('/') } as vscode.Uri;
        });

        axiosGetStub = sandbox.stub(axios, 'get');
        sandbox.stub(axios, 'isAxiosError').callsFake((err: any) => err.isAxiosError === true);

        SecretStorageService.init(mockContext);
        LoggingService.init(mockContext);
        HistoryService.init(mockContext);

        quotaService = new QuotaService(0, loggingServiceMock, historyServiceMock);
        statusBar = new QuotaStatusBar();
        accountsProvider = new AccountsProvider();
        detailsView = new DetailsView({ toString: () => 'file:///test' } as vscode.Uri, accountsProvider, historyServiceMock);
    });

    teardown(() => {
        sandbox.restore();
    });

    test('Test 1: Account lifecycle - add, edit, remove', async () => {
        const tokenSecretName = 'opencode.token.1234567890';
        const token = 'test-token-123';
        const newToken = 'new-token-456';
        axiosGetStub.resolves({ data: { usage: { total_tokens: 1500 }, quota: { limit: 5000 } } });

        await secretStorageMock.storeSecret(tokenSecretName, token);
        assert.ok(secretStorageMock.storeSecret.calledWith(tokenSecretName, token));

        secretStorageMock.storeSecret.resetHistory();
        await secretStorageMock.storeSecret(tokenSecretName, newToken);
        assert.ok(secretStorageMock.storeSecret.calledWith(tokenSecretName, newToken));

        await secretStorageMock.deleteSecret(tokenSecretName);
        assert.ok(secretStorageMock.deleteSecret.calledWith(tokenSecretName));
    });

    test('Test 2: Multi-account with rate limits', async () => {
        const accounts: Account[] = [
            { name: 'acc1', type: 'token', tokenSecretName: 's1', endpoint: 'api1' },
            { name: 'acc2', type: 'token', tokenSecretName: 's2', endpoint: 'api2' }
        ];

        axiosGetStub.onFirstCall().resolves({ data: { usage: { total_tokens: 1000 }, quota: { limit: 5000 } } });
        axiosGetStub.onSecondCall().rejects({ isAxiosError: true, response: { status: 429 }, message: 'Too Many Requests' });
        axiosGetStub.onThirdCall().resolves({ data: { usage: { total_tokens: 2000 }, quota: { limit: 5000 } } });

        secretStorageMock.getSecret.callsFake(async (name: string) => name === 's1' ? 't1' : 't2');

        const results = await quotaService.fetchAll(accounts, defaultAdapterConfig);
        assert.strictEqual(results[1].status, 'error');

        sandbox.stub(Date, 'now').returns(Date.now() + 2000);
        quotaService.clearCache();
        const result2 = await quotaService.fetchQuota(accounts[1], defaultAdapterConfig);
        assert.strictEqual(result2.status, 'ok');
        assert.strictEqual(result2.quota?.used, 2000);
    });

    test('Test 3: Details view with history data', async () => {
        const status: AccountStatus = {
            account: { name: 'test', type: 'token', tokenSecretName: 's1', endpoint: 'api' },
            quota: { used: 1500, limit: 5000, remaining: 3500, reset: null },
            status: 'ok', lastUpdated: Date.now()
        };
        const historyData = Array.from({ length: 24 }, (_, i) => ({ timestamp: new Date(Date.now() - (23 - i) * 3600000), used: 1000 + i * 50, limit: 5000 }));
        historyServiceMock.getHistory.returns(historyData);

        const html = (detailsView as any).getHtml(status as any);
        assert.ok(html.includes('<polyline'));
        const pointsMatch = html.match(/points="([^"]+)"/);
        assert.ok(pointsMatch);
        assert.strictEqual(pointsMatch[1].split(' ').length, 24);
    });

    test('Test 4: Auto-refresh with multiple accounts', async () => {
        const accounts: Account[] = [
            { name: 'acc1', type: 'token', tokenSecretName: 's1', endpoint: 'api1' },
            { name: 'acc2', type: 'token', tokenSecretName: 's2', endpoint: 'api2' }
        ];
        axiosGetStub.onCall(0).resolves({ data: { usage: { total_tokens: 1500 }, quota: { limit: 5000 } } });
        axiosGetStub.onCall(1).resolves({ data: { usage: { total_tokens: 2500 }, quota: { limit: 5000 } } });
        axiosGetStub.onCall(2).resolves({ data: { usage: { total_tokens: 1600 }, quota: { limit: 5000 } } });
        axiosGetStub.onCall(3).resolves({ data: { usage: { total_tokens: 2600 }, quota: { limit: 5000 } } });

        const statuses = await quotaService.fetchAll(accounts, defaultAdapterConfig);
        statusBar.update(statuses);
        const mockStatusBarItem = (vscode.window.createStatusBarItem as sinon.SinonStub).returnValues[0];
        assert.ok(mockStatusBarItem.text.includes('4000'));

        quotaService.clearCache();
        const newStatuses = await quotaService.fetchAll(accounts, defaultAdapterConfig);
        statusBar.update(newStatuses);
        assert.ok(mockStatusBarItem.text.includes('4200'));
    });

    test('Test 5: Error recovery - invalid token to valid token', async () => {
        const account: Account = { name: 'test', type: 'token', tokenSecretName: 's', endpoint: 'api' };
        axiosGetStub.onFirstCall().rejects({ isAxiosError: true, response: { status: 401 }, message: 'Unauthorized' });
        axiosGetStub.onSecondCall().resolves({ data: { usage: { total_tokens: 1500 }, quota: { limit: 5000 } } });

        const errorResult = await quotaService.fetchQuota(account, defaultAdapterConfig);
        assert.strictEqual(errorResult.status, 'error');
        assert.ok(errorResult.error?.includes('401'));

        quotaService.clearCache();
        const successResult = await quotaService.fetchQuota(account, defaultAdapterConfig);
        assert.strictEqual(successResult.status, 'ok');
        assert.strictEqual(successResult.quota?.used, 1500);
    });
});
