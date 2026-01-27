 import axios from 'axios';
import pLimit from 'p-limit';
import { Account, AccountStatus, QuotaAdapterConfig } from '../models/types';

import { SecretStorageService } from './SecretStorageService';
import { QuotaAdapter } from '../adapter/QuotaAdapter';
import { HistoryService } from './HistoryService';
import { LoggingService } from './LoggingService';

export class QuotaService {
    private cache: Map<string, AccountStatus> = new Map();
    private cacheTTL: number = 300 * 1000; // 5 mins default
    private rateLimitState: Map<string, { retryCount: number, nextRetryTime: Date }> = new Map();
    private inFlight: Map<string, Promise<AccountStatus | null>> = new Map();

    constructor(
        ttlSeconds: number,
        private loggingService: LoggingService,
        private historyService: HistoryService
    ) {
        this.cacheTTL = ttlSeconds * 1000;
    }

    async fetchQuota(account: Account, adapterConfig: QuotaAdapterConfig): Promise<AccountStatus> {
        // Check if already in-flight for this account
        const existing = this.inFlight.get(account.name);
        if (existing) {
            this.loggingService.logInfo(`Reusing in-flight request for ${account.name}`);
            return existing as Promise<AccountStatus>;
        }

        // Mark as in-flight
        const promise = this.doFetchQuota(account, adapterConfig)
            .then(result => {
                this.inFlight.delete(account.name);
                return result;
            })
            .catch(error => {
                this.inFlight.delete(account.name);
                throw error;
            });

        this.inFlight.set(account.name, promise);
        return promise as Promise<AccountStatus>;
    }

    private async doFetchQuota(account: Account, adapterConfig: QuotaAdapterConfig): Promise<AccountStatus> {
        const cached = this.cache.get(account.name);
        const now = Date.now();

        // Check Rate Limit State
        const rateLimit = this.rateLimitState.get(account.name);
        if (rateLimit && now < rateLimit.nextRetryTime.getTime()) {
            this.loggingService.logInfo(`Skipping fetch for ${account.name} in cooldown. Next retry after: ${rateLimit.nextRetryTime.toISOString()}`);
            if (cached) {
                return cached;
            }
            return {
                account,
                quota: null,
                status: 'error',
                error: `Rate limit cooldown. Try again after ${rateLimit.nextRetryTime.toLocaleTimeString()}`,
                lastUpdated: now
            };
        }

        if (cached && (now - cached.lastUpdated < this.cacheTTL)) {
            return cached;
        }

        try {
            const token = await SecretStorageService.instanceRef.getSecret(account.tokenSecretName);
            if (!token) {
                throw new Error(`Token not found for secret: ${account.tokenSecretName}`);
            }

            const response = await axios.get(account.endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            });

            const adapter = new QuotaAdapter(adapterConfig);
            const quota = adapter.adapt(response.data);

            const status: AccountStatus = {
                account,
                quota,
                status: 'ok',
                lastUpdated: now
            };

            // Success: Reset rate limit and add history point
            this.rateLimitState.set(account.name, { retryCount: 0, nextRetryTime: new Date(0) });
            await this.historyService.addHistoryPoint(account.name, quota);
            this.loggingService.logInfo(`Successfully fetched quota for ${account.name}`);

            this.cache.set(account.name, status);
            return status;

        } catch (error: any) {
            const isRateLimit = axios.isAxiosError(error) && (error.response?.status === 429 || (error.response?.status && error.response.status >= 500));
            
            if (isRateLimit) {
                const currentRetry = rateLimit?.retryCount ?? 0;
                const delay = 1000 * Math.pow(2, currentRetry);
                const nextRetry = new Date(now + delay);
                
                this.rateLimitState.set(account.name, { 
                    retryCount: Math.min(currentRetry + 1, 5), 
                    nextRetryTime: nextRetry 
                });
                
                this.loggingService.logInfo(`Rate limit or server error for ${account.name}, retry #${currentRetry + 1} in ${delay}ms`);
            }

            const errorMsg = axios.isAxiosError(error) 
                ? `API Error: ${error.response?.status} - ${error.message}`
                : `Error: ${error.message}`;
            
            const errorStatus: AccountStatus = {
                account,
                quota: null,
                status: 'error',
                error: errorMsg,
                lastUpdated: now
            };
            
            // Do not cache errors for full TTL, maybe shorter, but for now simple overwrite
            this.cache.set(account.name, errorStatus);
            return errorStatus;
        }
    }

    async fetchAll(accounts: Account[], adapterConfig: QuotaAdapterConfig, maxConcurrent = 3): Promise<AccountStatus[]> {
        const limit = pLimit(maxConcurrent);
        return Promise.all(accounts.map(acc => limit(() => this.fetchQuota(acc, adapterConfig))));
    }

    clearCache() {
        this.cache.clear();
    }

    public dispose() {
        this.inFlight.clear();
    }
}
