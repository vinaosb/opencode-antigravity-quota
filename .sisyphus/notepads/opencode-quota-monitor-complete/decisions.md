# OpenCode Quota Monitor - Decisions

## Architecture Decisions

### History Storage
**Decision**: Use VS Code GlobalState for 24h history data
**Reason**: Non-sensitive data, simpler than SecretStorage, persists across sessions

### Rate-Limit Backoff
**Decision**: Exponential backoff with 1s base, 2x multiplier, max 5 retries
**Reason**: Standard pattern, balances responsiveness with API protection

### Chart Implementation
**Decision**: SVG polyline + HTML/CSS (no external libraries)
**Reason**: Lightweight, no new dependencies, sufficient for simple line chart

### Logging
**Decision**: Dedicated OutputChannel "OpenCode Quota Monitor" with debug/info/error levels
**Reason**: VS Code native, user can view in Output panel, structured logging

## Design Decisions

### History Data Structure
```typescript
interface HistoryData {
  timestamp: Date;
  used: number;
  limit: number;
}
```
**Reason**: Simple, matches QuotaUsage structure, easy to serialize

### Per-Account Rate-Limit State
```typescript
Map<string, { retryCount: number, nextRetryTime: Date }>
```
**Reason**: Each account independent, simple tracking, map lookup efficient

### Webview Chart Rendering
**Decision**: Server-side (extension-side) SVG generation
**Reason**: Avoids CSP issues with inline scripts, eliminates need for separate client-side JS bundle, simplifies data passing (no `postMessage`).
