import * as vscode from 'vscode';
import { AccountStatus } from '../models/types';

export class AccountsProvider implements vscode.TreeDataProvider<AccountItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<AccountItem | undefined | null | void> = new vscode.EventEmitter<AccountItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AccountItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private statuses: AccountStatus[] = [];

    refresh(statuses: AccountStatus[]): void {
        this.statuses = statuses;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AccountItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: AccountItem): Thenable<AccountItem[]> {
        if (element) {
            return Promise.resolve([]); // No nesting for now
        }
        return Promise.resolve(
            this.statuses.map(status => new AccountItem(status))
        );
    }
}

export class AccountItem extends vscode.TreeItem {
    constructor(public readonly status: AccountStatus) {
        super(status.account.name, vscode.TreeItemCollapsibleState.None);
        
        this.tooltip = `${this.status.account.endpoint}`;
        
        if (this.status.status === 'error') {
            this.description = 'Error';
            this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
        } else if (this.status.quota) {
            const { used, limit, remaining } = this.status.quota;
            this.description = `${used}/${limit} (Rem: ${remaining})`;
            this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        } else {
            this.description = 'Loading...';
        }

        this.command = {
            command: 'opencodeQuota.openDetails',
            title: 'Open Details',
            arguments: [this.status]
        };
    }
}
