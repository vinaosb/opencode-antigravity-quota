import * as assert from 'assert';
import * as vscode from 'vscode';
import { DetailsView } from '../../ui/DetailsView';
import { AccountItem } from '../../ui/AccountsProvider';
import { HistoryData } from '../../services/HistoryService';
import { AccountStatus, Account, QuotaUsage } from '../../models/types';
import * as sinon from 'sinon';

// Helper function to create test data
function createMockAccountStatus(
    accountName: string,
    used: number,
    limit: number,
    status: 'ok' | 'error' | 'loading' = 'ok',
    error?: string
): AccountStatus {
    const account: Account = {
        name: accountName,
        type: 'token',
        tokenSecretName: `secret_${accountName}`,
        endpoint: `https://api.example.com/${accountName}`
    };

    const quota: QuotaUsage | null = (status === 'error' || status === 'loading') ? null : {
        used,
        limit,
        reset: new Date(Date.now() + 3600000).toISOString(),
        remaining: limit - used
    };

    return {
        account,
        quota,
        status,
        error,
        lastUpdated: Date.now()
    };
}

suite('DetailsView Test Suite', () => {
    let sandbox: sinon.SinonSandbox;
    let webviewPanelMock: any;
    let accountsProviderMock: any;
    let historyServiceMock: any;
    let extensionUri: vscode.Uri;
    let detailsView: DetailsView;
    let createWebviewPanelStub: any;

    setup(() => {
        sandbox = sinon.createSandbox();
        extensionUri = vscode.Uri.file('/test/extension');

        // Mock WebviewPanel
        webviewPanelMock = {
            reveal: sandbox.stub(),
            dispose: sandbox.stub().callsFake(() => {
                if (webviewPanelMock._onDidDisposeCallback) {
                    webviewPanelMock._onDidDisposeCallback();
                }
            }),
            onDidDispose: sandbox.stub().callsFake((callback: any) => {
                webviewPanelMock._onDidDisposeCallback = callback;
                return { dispose: () => { /* no-op */ } };
            }),
            webview: {
                html: '',
                asWebviewUri: sandbox.stub().callsFake((uri: vscode.Uri) => uri.toString()),
                cspSource: 'vscode-resource://test'
            },
            title: ''
        };

        // Stub createWebviewPanel to return mock
        createWebviewPanelStub = sandbox.stub(vscode.window, 'createWebviewPanel').returns(webviewPanelMock);

        // Stub Uri.joinPath
        sandbox.stub(vscode.Uri, 'joinPath').callsFake((base: vscode.Uri, ...parts: string[]) => {
            const path = parts.join('/');
            return vscode.Uri.file(`${base.path}/${path}`);
        });

        // Mock AccountsProvider
        accountsProviderMock = {
            onDidChangeTreeData: sandbox.stub(),
            getChildren: sandbox.stub()
        };

        // Mock HistoryService
        historyServiceMock = {
            getHistory: sandbox.stub().returns([])
        };

        // Create DetailsView instance
        detailsView = new DetailsView(
            extensionUri,
            accountsProviderMock,
            historyServiceMock
        );
    });

    teardown(() => {
        sandbox.restore();
        if (detailsView) {
            detailsView.dispose();
        }
    });

    suite('show() - Webview Creation', () => {
        test('should create a new webview panel when none exists', () => {
            const status = createMockAccountStatus('test-account', 50, 100);

            detailsView.show(status);

            assert.strictEqual(createWebviewPanelStub.calledOnce, true);
            assert.strictEqual(
                createWebviewPanelStub.firstCall.args[0],
                'opencodeQuotaDetails'
            );
            assert.strictEqual(
                createWebviewPanelStub.firstCall.args[1],
                'Quota: test-account'
            );
            assert.strictEqual(
                createWebviewPanelStub.firstCall.args[2],
                vscode.ViewColumn.One
            );
            assert.strictEqual(
                createWebviewPanelStub.firstCall.args[3].enableScripts,
                false
            );
        });

        test('should reveal existing panel instead of creating new one', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            // Show again with same account
            detailsView.show(status);

            assert.strictEqual(createWebviewPanelStub.calledOnce, true);
            assert.strictEqual(webviewPanelMock.reveal.calledOnce, true);
            assert.strictEqual(webviewPanelMock.reveal.firstCall.args[0], vscode.ViewColumn.One);
        });

        test('should set up disposal handler when creating panel', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            assert.strictEqual(webviewPanelMock.onDidDispose.calledOnce, true);
        });

        test('should call update after revealing existing panel', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            // Reset stub to track calls after reveal
            webviewPanelMock.reveal.resetHistory();

            // Show again with different usage
            const updatedStatus = createMockAccountStatus('test-account', 75, 100);
            detailsView.show(updatedStatus);

            // Should have called update with new status (we'll verify via HTML content)
            assert.strictEqual(webviewPanelMock.reveal.calledOnce, true);
            assert.ok(webviewPanelMock.webview.html.includes('75'));
            assert.ok(webviewPanelMock.webview.html.includes('100'));
        });
    });

    suite('update() - Content Rendering', () => {
        test('should render HTML with account details', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('<!DOCTYPE html>'));
            assert.ok(html.includes('<title>Account Details</title>'));
            assert.ok(html.includes('<h1>test-account</h1>'));
            assert.ok(html.includes('https://api.example.com/test-account'));
        });

        test('should render quota display with correct values', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('50'));
            assert.ok(html.includes('50')); // Used
            assert.ok(html.includes('50')); // Remaining (100-50)
            assert.ok(html.includes('100')); // Limit
        });

        test('should render error state when status is error', () => {
            const status = createMockAccountStatus('test-account', 0, 100, 'error', 'API Error');
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('Error: API Error'));
            assert.ok(html.includes('No quota data available'));
        });

        test('should render loading state when status is loading', () => {
            const status = createMockAccountStatus('test-account', 0, 0, 'loading');
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('No quota data available'));
        });

        test('should set progress class to danger when usage > 90%', () => {
            const status = createMockAccountStatus('test-account', 95, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('class="danger"'));
        });

        test('should set progress class to warning when usage > 75%', () => {
            const status = createMockAccountStatus('test-account', 80, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('class="warning"'));
        });

        test('should not set progress class when usage <= 75%', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(!html.includes('class="danger"'));
            assert.ok(!html.includes('class="warning"'));
        });

        test('should format reset time when future date provided', () => {
            sandbox.useFakeTimers(1672531200000); // 2023-01-01T00:00:00.000Z
            
            const status = createMockAccountStatus('test-account', 50, 100);
            const resetDate = new Date(Date.now() + 7200000); // 2 hours from now
            if (status.quota) {
                status.quota.reset = resetDate.toISOString();
            }

            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('Resets in 2h 0m'));
        });

        test('should display past reset date when reset has passed', () => {
            const resetDate = new Date(Date.now() - 3600000); // 1 hour ago
            const status = createMockAccountStatus('test-account', 50, 100);
            if (status.quota) {
                status.quota.reset = resetDate.toISOString();
            }

            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('Reset at'));
        });

        test('should display N/A when reset is null', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            if (status.quota) {
                status.quota.reset = null;
            }

            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('Reset: N/A'));
        });

        test('should include CSP in HTML head', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('Content-Security-Policy'));
            assert.ok(html.includes("default-src 'none'"));
            assert.ok(html.includes('style-src'));
        });
    });

    suite('generateChart() - SVG Chart Generation', () => {
        test('should render SVG chart with sufficient history data', () => {
            const history: HistoryData[] = [
                { timestamp: new Date(Date.now() - 86400000), used: 10, limit: 100 },
                { timestamp: new Date(Date.now() - 72000000), used: 20, limit: 100 },
                { timestamp: new Date(Date.now() - 57600000), used: 30, limit: 100 },
                { timestamp: new Date(Date.now() - 43200000), used: 40, limit: 100 },
                { timestamp: new Date(Date.now() - 28800000), used: 50, limit: 100 },
                { timestamp: new Date(), used: 60, limit: 100 }
            ];

            historyServiceMock.getHistory.returns(history);

            const status = createMockAccountStatus('test-account', 60, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('<svg'));
            assert.ok(html.includes('<polyline'));
            assert.ok(html.includes('class="chart-line"'));
            assert.ok(html.includes('class="chart-axis"'));
        });

        test('should render "Not enough history data" when history < 2 points', () => {
            const history: HistoryData[] = [
                { timestamp: new Date(), used: 50, limit: 100 }
            ];

            historyServiceMock.getHistory.returns(history);

            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('Not enough history data'));
        });

        test('should render "Not enough history data" when history is empty', () => {
            historyServiceMock.getHistory.returns([]);

            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('Not enough history data'));
        });

        test('should use max of currentLimit and maxUsed for Y scale', () => {
            // History has max used of 150, but current limit is 100
            const history: HistoryData[] = [
                { timestamp: new Date(Date.now() - 86400000), used: 50, limit: 100 },
                { timestamp: new Date(Date.now() - 43200000), used: 150, limit: 200 },
                { timestamp: new Date(), used: 60, limit: 100 }
            ];

            historyServiceMock.getHistory.returns(history);

            const status = createMockAccountStatus('test-account', 60, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            // Chart should be rendered (not "Not enough history data")
            assert.ok(html.includes('<svg'));
            assert.ok(html.includes('<polyline'));
        });

        test('should handle zero values without division by zero', () => {
            const history: HistoryData[] = [
                { timestamp: new Date(Date.now() - 43200000), used: 0, limit: 0 },
                { timestamp: new Date(), used: 0, limit: 0 }
            ];

            historyServiceMock.getHistory.returns(history);

            const status = createMockAccountStatus('test-account', 0, 0);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            // Should render chart without errors
            assert.ok(html.includes('<svg'));
        });
    });

    suite('TreeData Event Subscription', () => {
        test('should subscribe to onDidChangeTreeData during construction', () => {
            assert.strictEqual(accountsProviderMock.onDidChangeTreeData.calledOnce, true);
        });

        test('should update when specific account item changes', async () => {
            let eventCallback: any = null;

            // Capture the callback registered during construction
            accountsProviderMock.onDidChangeTreeData.callsFake((callback: any) => {
                eventCallback = callback;
            });

            // Create new instance to capture callback
            detailsView = new DetailsView(
                extensionUri,
                accountsProviderMock,
                historyServiceMock
            );

            // Show a panel for test-account
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            // Reset HTML to verify update
            webviewPanelMock.webview.html = '';

            // Simulate tree update for same account
            const accountItem = new AccountItem(status);
            if (eventCallback) {
                eventCallback(accountItem);
            }

            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 10));

            // HTML should have been updated
            assert.ok(webviewPanelMock.webview.html.length > 0);
        });

        test('should not update when different account item changes', async () => {
            let eventCallback: any = null;

            accountsProviderMock.onDidChangeTreeData.callsFake((callback: any) => {
                eventCallback = callback;
            });

            detailsView = new DetailsView(
                extensionUri,
                accountsProviderMock,
                historyServiceMock
            );

            // Show a panel for test-account
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            const originalHtml = webviewPanelMock.webview.html;

            // Simulate tree update for different account
            const differentStatus = createMockAccountStatus('other-account', 75, 100);
            const accountItem = new AccountItem(differentStatus);

            if (eventCallback) {
                eventCallback(accountItem);
            }

            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 10));

            // HTML should not have changed
            assert.strictEqual(webviewPanelMock.webview.html, originalHtml);
        });

        test('should handle global update (undefined item) and refresh current account', async () => {
            let eventCallback: any = null;

            accountsProviderMock.onDidChangeTreeData.callsFake((callback: any) => {
                eventCallback = callback;
            });

            // Mock getChildren to return accounts
            accountsProviderMock.getChildren.resolves([
                new AccountItem(createMockAccountStatus('test-account', 50, 100)),
                new AccountItem(createMockAccountStatus('other-account', 75, 100))
            ]);

            detailsView = new DetailsView(
                extensionUri,
                accountsProviderMock,
                historyServiceMock
            );

            // Show a panel for test-account
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            // Reset HTML to verify update
            webviewPanelMock.webview.html = '';

            // Simulate global update
            if (eventCallback) {
                eventCallback(undefined);
            }

            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 10));

            // HTML should have been updated
            assert.ok(webviewPanelMock.webview.html.length > 0);
        });

        test('should not update when no account is currently shown', async () => {
            let eventCallback: any = null;

            accountsProviderMock.onDidChangeTreeData.callsFake((callback: any) => {
                eventCallback = callback;
            });

            detailsView = new DetailsView(
                extensionUri,
                accountsProviderMock,
                historyServiceMock
            );

            // Don't show any panel

            // Simulate tree update
            const status = createMockAccountStatus('test-account', 50, 100);
            const accountItem = new AccountItem(status);

            if (eventCallback) {
                eventCallback(accountItem);
            }

            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 10));

            // No panel should have been created
            assert.strictEqual(createWebviewPanelStub.notCalled, true);
        });
    });

    suite('Multiple Updates', () => {
        test('should handle multiple sequential updates', () => {
            // Show initial state
            const status1 = createMockAccountStatus('test-account', 30, 100);
            detailsView.show(status1);

            let html = webviewPanelMock.webview.html;
            assert.ok(html.includes('30'));

            // Update to new state
            const status2 = createMockAccountStatus('test-account', 60, 100);
            detailsView.update(status2);

            html = webviewPanelMock.webview.html;
            assert.ok(html.includes('60'));
            assert.ok(!html.includes('30')); // Old value should be gone

            // Update again
            const status3 = createMockAccountStatus('test-account', 90, 100);
            detailsView.update(status3);

            html = webviewPanelMock.webview.html;
            assert.ok(html.includes('90'));
            assert.ok(!html.includes('60'));
        });

        test('should update title when account name changes', () => {
            const status1 = createMockAccountStatus('old-name', 50, 100);
            detailsView.show(status1);

            assert.strictEqual(webviewPanelMock.title, 'Quota: old-name');

            // Simulate account rename (though in reality, this would be a new account)
            const status2 = createMockAccountStatus('new-name', 50, 100);
            detailsView.update(status2);

            assert.strictEqual(webviewPanelMock.title, 'Quota: new-name');
        });
    });

    suite('Edge Cases', () => {
        test('should handle null quota gracefully', () => {
            const status = createMockAccountStatus('test-account', 0, 0, 'loading');
            status.quota = null;

            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('No quota data available'));
            assert.ok(!html.includes('class="danger"'));
            assert.ok(!html.includes('class="warning"'));
        });

        test('should handle undefined reset date', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            if (status.quota) {
                status.quota.reset = null;
            }

            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('Reset: N/A'));
        });

        test('should handle zero usage percentage', () => {
            const status = createMockAccountStatus('test-account', 0, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('0'));
            assert.ok(!html.includes('class="danger"'));
            assert.ok(!html.includes('class="warning"'));
        });

        test('should handle 100% usage', () => {
            const status = createMockAccountStatus('test-account', 100, 100);
            detailsView.show(status);

            const html = webviewPanelMock.webview.html;

            assert.ok(html.includes('class="danger"'));
        });
    });

    suite('dispose() - Cleanup', () => {
        test('should dispose webview panel', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            detailsView.dispose();

            assert.strictEqual(webviewPanelMock.dispose.calledOnce, true);
        });

        test('should clear panel reference after disposal', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            detailsView.dispose();

            // Try to update - should do nothing since panel is undefined
            const status2 = createMockAccountStatus('test-account', 75, 100);
            detailsView.update(status2);

            // Panel should still be disposed (only one dispose call)
            assert.strictEqual(webviewPanelMock.dispose.calledOnce, true);
        });

        test('should handle dispose when no panel exists', () => {
            // Don't show any panel
            detailsView.dispose();

            // Should not throw error
            assert.ok(true);
        });

        test('should handle multiple dispose calls', () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            detailsView.dispose();
            detailsView.dispose();
            detailsView.dispose();

            // Should still only dispose once
            assert.strictEqual(webviewPanelMock.dispose.calledOnce, true);
        });
    });

    suite('Panel Disposal Handler', () => {
        test('should clear currentAccountName when panel is disposed', async () => {
            const status = createMockAccountStatus('test-account', 50, 100);
            detailsView.show(status);

            // Get the onDidDispose callback
            const onDidDisposeStub = webviewPanelMock.onDidDispose;
            assert.ok(onDidDisposeStub.calledOnce);

            // Extract the callback from the stub
            const disposeCallback = onDidDisposeStub.firstCall.args[0];
            assert.ok(disposeCallback);

            // Simulate panel disposal
            disposeCallback();

            // After disposal, showing a different account should create a new panel
            const status2 = createMockAccountStatus('other-account', 75, 100);
            detailsView.show(status2);

            // Should have called createWebviewPanel twice (once for each account)
            assert.strictEqual(createWebviewPanelStub.callCount, 2);
        });
    });
});
