# OpenCode Quota Monitor - Issues and Gotchas

## Known Issues

None yet - project in initial implementation

## Gotchas to Avoid

### Secret Storage
- NEVER log secrets (tokens, passwords) - mask with ***
- Use SecretStorage for tokens ONLY
- Use GlobalState for history, rate-limit state

### Webview CSP
- No inline scripts (use webview.asWebviewUri for resources)
- CSP restrictions apply

### State Management
- History limited to 24 points - FIFO eviction on 25th point
- Cache invalidation on token changes
- Rate-limit state per-account (independent)

### Test Structure
- Tests in `src/test/suite/` NOT `test/suite/`
- Use Mocha test framework
- Mock VS Code APIs in tests
