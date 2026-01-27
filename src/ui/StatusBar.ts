import * as vscode from 'vscode';
import { AccountStatus } from '../models/types';

export class QuotaStatusBar {
    private item: vscode.StatusBarItem;

    constructor() {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.item.command = 'opencodeQuota.openDetails';
    }

    update(statuses: AccountStatus[]) {
        const totalUsed = statuses.reduce((sum, s) => sum + (s.quota?.used || 0), 0);
        const totalLimit = statuses.reduce((sum, s) => sum + (s.quota?.limit || 0), 0);
        const hasError = statuses.some(s => s.status === 'error');
        
        const icon = hasError ? '$(warning)' : '$(graph)';
        const text = `Quota: ${totalUsed}/${totalLimit}`;
        
        this.item.text = `${icon} ${text}`;
        
        if (hasError) {
            this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.item.tooltip = "Some accounts have errors. Click for details.";
        } else {
            this.item.backgroundColor = undefined;
            this.item.tooltip = "Click to view detailed quota usage";
        }
        
        this.item.show();
    }

    dispose() {
        this.item.dispose();
    }
}
