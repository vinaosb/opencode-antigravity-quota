import * as vscode from 'vscode';
import { AccountStatus } from '../models/types';
import { AccountsProvider } from './AccountsProvider';
import { HistoryService, HistoryData } from '../services/HistoryService';

export class DetailsView {
    private panel: vscode.WebviewPanel | undefined;
    private disposables: vscode.Disposable[] = [];
    private currentAccountName: string | undefined;

    constructor(
        private extensionUri: vscode.Uri,
        private accountsProvider: AccountsProvider,
        private historyService: HistoryService
    ) {
        // Subscribe to updates
        this.accountsProvider.onDidChangeTreeData(async (item) => {
            if (item) {
                if (this.currentAccountName && item.status.account.name === this.currentAccountName) {
                    this.update(item.status);
                }
            } else {
                // Global update (e.g. Refresh all)
                if (this.currentAccountName) {
                    const children = await this.accountsProvider.getChildren();
                    const current = children.find(c => c.status.account.name === this.currentAccountName);
                    if (current) {
                        this.update(current.status);
                    }
                }
            }
        }, null, this.disposables);
    }

    public show(status: AccountStatus): void {
        this.currentAccountName = status.account.name;

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            this.update(status); // Ensure content is fresh
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'opencodeQuotaDetails',
            `Quota: ${status.account.name}`,
            vscode.ViewColumn.One,
            {
                enableScripts: false, // No inline scripts allowed per CSP
                localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'src', 'ui')]
            }
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
            this.currentAccountName = undefined;
        }, null, this.disposables);

        this.update(status);
    }

    public update(status: AccountStatus): void {
        if (!this.panel) {
            return;
        }
        
        // Update title in case it changed
        this.panel.title = `Quota: ${status.account.name}`;
        this.panel.webview.html = this.getHtml(status);
    }

    private getHtml(status: AccountStatus): string {
        const styleUri = this.panel?.webview.asWebviewUri(
            vscode.Uri.joinPath(this.extensionUri, 'src', 'ui', 'detailsView.css')
        );

        const history = this.historyService.getHistory(status.account.name);
        const chartSvg = this.generateChart(history, status.quota?.limit || 100);
        
        const usagePercent = status.quota ? (status.quota.used / status.quota.limit) * 100 : 0;
        let progressClass = '';
        if (usagePercent > 90) progressClass = 'danger';
        else if (usagePercent > 75) progressClass = 'warning';

        // Format reset date
        let resetText = 'N/A';
        if (status.quota?.reset) {
            const resetDate = new Date(status.quota.reset);
            const now = new Date();
            const diffMs = resetDate.getTime() - now.getTime();
            if (diffMs > 0) {
                const hours = Math.floor(diffMs / (1000 * 60 * 60));
                const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                resetText = `Resets in ${hours}h ${minutes}m (${resetDate.toLocaleTimeString()})`;
            } else {
                resetText = `Reset at ${resetDate.toLocaleTimeString()}`;
            }
        }

        const lastUpdatedDate = new Date(status.lastUpdated);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel?.webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>Account Details</title>
</head>
<body>
    <div class="container">
        <h1>${status.account.name}</h1>
        <div class="account-endpoint">${status.account.endpoint}</div>

        <div class="card">
            <div class="section-title">Current Usage</div>
            
            ${status.status === 'error' ? `<p style="color: var(--vscode-errorForeground)">Error: ${status.error}</p>` : ''}
            
            ${status.quota ? `
                <div class="quota-display">
                    <progress class="${progressClass}" value="${status.quota.used}" max="${status.quota.limit}"></progress>
                </div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Used</span>
                        <span class="stat-value">${status.quota.used}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Remaining</span>
                        <span class="stat-value">${status.quota.remaining}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Limit</span>
                        <span class="stat-value">${status.quota.limit}</span>
                    </div>
                </div>
            ` : '<p>No quota data available.</p>'}
        </div>

        <div class="card">
            <div class="section-title">24h History</div>
            <div class="chart-container">
                ${chartSvg}
            </div>
        </div>

        <div class="footer">
            <p>Reset: ${resetText}</p>
            <p>Last Updated: ${lastUpdatedDate.toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;
    }

    private generateChart(history: HistoryData[], currentLimit: number): string {
        if (history.length < 2) {
            return '<div style="display:flex;justify-content:center;align-items:center;height:100%;color:var(--vscode-descriptionForeground)">Not enough history data</div>';
        }

        // SVG ViewBox dimensions
        const width = 300;
        const height = 100;
        const padding = 5;

        // Determine Y scale based on max limit seen or current limit
        // We want the chart to be consistent, so usually we stick to the limit.
        // But if history has different limits, we might want to normalize.
        // For simplicity, let's use the max of (currentLimit, maxUsed in history).
        const maxVal = Math.max(currentLimit, ...history.map(h => h.used));
        
        // Map points
        // X: 0 to width
        // Y: height to 0 (since 0 is top)
        
        const points = history.map((point, index) => {
            const x = (index / (history.length - 1)) * width;
            // Ensure we don't divide by zero if maxVal is 0
            const ratio = maxVal > 0 ? point.used / maxVal : 0;
            const y = height - (ratio * height); 
            return `${x},${y}`;
        }).join(' ');

        return `
        <svg viewBox="0 -${padding} ${width} ${height + 2 * padding}" preserveAspectRatio="none">
            <!-- Axis lines -->
            <line x1="0" y1="${height}" x2="${width}" y2="${height}" class="chart-axis" />
            <line x1="0" y1="0" x2="0" y2="${height}" class="chart-axis" />
            
            <!-- Data line -->
            <polyline points="${points}" class="chart-line" />
        </svg>`;
    }

    public dispose(): void {
        this.panel?.dispose();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
