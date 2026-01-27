import * as vscode from 'vscode';
import { QuotaUsage } from '../models/types';
import { LoggingService } from './LoggingService';

/**
 * Interface representing a single point in the quota usage history.
 */
export interface HistoryData {
    timestamp: Date;
    used: number;
    limit: number;
}

/**
 * Service for managing quota usage history for accounts.
 * Maintains up to 24 data points per account in VS Code GlobalState.
 */
export class HistoryService {
    private static instance: HistoryService;
    private readonly MAX_POINTS = 24;
    private readonly KEY_PREFIX = 'opencodeQuota.history.';

    private constructor(private globalState: vscode.Memento) {}

    /**
     * Initializes the HistoryService singleton.
     * @param context The extension context.
     */
    static init(context: vscode.ExtensionContext): void {
        HistoryService.instance = new HistoryService(context.globalState);
    }

    /**
     * Gets the singleton instance of HistoryService.
     * @throws Error if the service has not been initialized.
     */
    static get instanceRef(): HistoryService {
        if (!HistoryService.instance) {
            throw new Error('HistoryService not initialized');
        }
        return HistoryService.instance;
    }

    /**
     * Generates the GlobalState key for a given account.
     * @param accountName The name of the account.
     * @returns The storage key.
     */
    private getKey(accountName: string): string {
        return `${this.KEY_PREFIX}${accountName}`;
    }

    /**
     * Retrieves the history for a given account.
     * @param accountName The name of the account.
     * @returns An array of HistoryData points.
     */
    getHistory(accountName: string): HistoryData[] {
        const key = this.getKey(accountName);
        const history = this.globalState.get<any[]>(key, []);
        
        // Ensure timestamps are Date objects after retrieval from storage
        return history.map(point => ({
            ...point,
            timestamp: new Date(point.timestamp)
        }));
    }

    /**
     * Adds a new history point for an account.
     * Enforces a maximum of 24 points (FIFO).
     * @param accountName The name of the account.
     * @param usage The current quota usage.
     */
    async addHistoryPoint(accountName: string, usage: QuotaUsage): Promise<void> {
        const key = this.getKey(accountName);
        let history = this.getHistory(accountName);

        const newPoint: HistoryData = {
            timestamp: new Date(),
            used: usage.used,
            limit: usage.limit
        };

        history.push(newPoint);

        // Keep only the most recent 24 points
        if (history.length > this.MAX_POINTS) {
            history = history.slice(-this.MAX_POINTS);
        }

        await this.globalState.update(key, history);
        LoggingService.instanceRef.logDebug(`Added history point for account: ${accountName}`, { 
            point: newPoint,
            totalPoints: history.length 
        });
    }

    /**
     * Clears all history for a given account.
     * @param accountName The name of the account.
     */
    async clearHistory(accountName: string): Promise<void> {
        const key = this.getKey(accountName);
        await this.globalState.update(key, undefined);
        LoggingService.instanceRef.logInfo(`Cleared history for account: ${accountName}`);
    }
}
