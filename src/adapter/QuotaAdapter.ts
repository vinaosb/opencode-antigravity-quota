import { QuotaUsage, QuotaAdapterConfig } from '../models/types';

export class QuotaAdapter {
    constructor(private config: QuotaAdapterConfig) {}

    adapt(data: any): QuotaUsage {
        const used = this.getValue(data, this.config.usedPath || 'usage.total_tokens') || 0;
        const limit = this.getValue(data, this.config.limitPath || 'quota.limit') || 0;
        const reset = this.getValue(data, this.config.resetPath || 'quota.reset_date') || null;

        return {
            used,
            limit,
            reset: reset ? new Date(reset).toISOString() : null,
            remaining: Math.max(0, limit - used)
        };
    }

    private getValue(obj: any, path: string): any {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }
}
