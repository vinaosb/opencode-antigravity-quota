export interface Account {
    name: string;
    type: 'token' | 'oauth' | 'serviceAccount';
    tokenSecretName: string; // Key used in SecretStorage
    endpoint: string;
}

export interface QuotaUsage {
    used: number;
    limit: number;
    reset: string | null; // ISO Date string
    remaining: number;
}

export interface AccountStatus {
    account: Account;
    quota: QuotaUsage | null;
    status: 'ok' | 'error' | 'loading';
    error?: string;
    lastUpdated: number;
}

export interface QuotaAdapterConfig {
    usedPath?: string;
    limitPath?: string;
    resetPath?: string;
}

export interface BackoffConfig {
    baseDelayMs: number;
    multiplier: number;
    maxDelayMs: number;
    maxRetries: number;
    errorCacheSeconds: number;
}
