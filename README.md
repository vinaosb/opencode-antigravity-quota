# OpenCode Quota Monitor

A VS Code extension to monitor usage quotas across multiple OpenCode accounts.

## Features
- **Status Bar**: Shows aggregated usage/limit across all accounts.
- **Sidebar**: Lists accounts and their status with real-time updates.
- **Multiple Accounts**: Support for multiple API endpoints and tokens.
- **24h History Tracking**: Automatic history collection with up to 24 data points per account (FIFO eviction).
- **Details View**: Interactive visualization with SVG charts showing quota usage over time.
- **Edit Account**: Update account name or token via a simple QuickPick interface.
- **Exponential Backoff**: Smart retry logic for API resilience (1s base, 2x multiplier, max 5 retries).
- **Rate-Limit Resilience**: Graceful handling of 429/5xx errors with automatic cooldown periods.
- **Debug Logging**: Comprehensive logging in the Output panel with automatic masking of sensitive data.
- **Secure Storage**: Tokens are stored in VS Code `SecretStorage` (never in plain text or settings.json).
- **Configurable Adapter**: Works with different JSON response shapes via path mapping.

## Setup & Configuration

### 1. Add an Account
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Run `OpenCode Quota: Add Account`.
3. Enter a name (e.g., "Main Account").
4. Enter the API Endpoint (e.g., `https://api.example.com/quota`).
5. Enter your API Token (this will be saved securely).

### 2. View Account Details
1. Find your account in the **OpenCode Quota** sidebar.
2. Right-click the account and select **View Details** (or simply click the account).
3. A webview panel will open showing:
   - Current usage vs limit.
   - A color-coded progress bar (Green < 70%, Yellow 70-90%, Red > 90%).
   - An SVG polyline chart showing usage history over the last 24 points.
   - Next quota reset time.
   - Any active error messages.

### 3. Edit an Account
1. Right-click an account in the sidebar and select **Edit Account**.
2. Select **Update Name** to change the display name.
3. Select **Update Token** to change the API token.
   - *Note: Leaving the token input empty will keep the existing token.*

### 4. Enable Debug Logging
1. Open the **Output** panel (`Ctrl+Shift+U` / `Cmd+Shift+U`).
2. Select **OpenCode Quota Monitor** from the dropdown menu.
3. Logs include fetch attempts, retries, cooldown skips, and detailed error messages.
4. **Security**: Sensitive keys like `token`, `password`, `secret`, and `key` are automatically masked with `***`.

### 5. Configure Adapter (Optional)
If your API response doesn't match the default structure, configure mapping in `settings.json`:

Default structure:
```json
{
  "usage": { "total_tokens": 123 },
  "quota": { "limit": 1000, "reset_date": "..." }
}
```

Custom mapping example:
```json
"opencodeQuota.adapterConfig": {
    "usedPath": "data.current_usage",
    "limitPath": "data.max_limit",
    "resetPath": "meta.reset_at"
}
```

### 5. Import OpenCode Accounts
If you have the **OpenCode antigravity-auth** plugin installed, you can import your existing accounts:
1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Run `OpenCode Quota: Import OpenCode Accounts`.
3. Confirm the number of accounts to import.
4. Accounts will be imported as **OAuth** type, leveraging your existing refresh tokens.

## Available Commands

| Command | Description |
|---------|-------------|
| `OpenCode Quota: Add Account` | Add a new account to monitor |
| `OpenCode Quota: Remove Account` | Remove an existing account |
| `OpenCode Quota: Edit Account` | Update account name or token |
| `OpenCode Quota: Refresh` | Manually refresh all account data |
| `OpenCode Quota: View Details` | Open detailed webview with history chart |
| `OpenCode Quota: Import OpenCode Accounts` | Import accounts from OpenCode antigravity-auth plugin |

## Development

### Prerequisites
- Node.js 18+
- npm

### Build & Run
```bash
npm install
npm run compile
```
Press `F5` in VS Code to launch the Extension Development Host.

### Run Tests
```bash
npm test
```

### Test Coverage
**Coverage: 100% (81/81 tests passing)**

The project includes a comprehensive test suite covering all services and UI components:
- **Commands**: 18 tests ✅
- **Details View**: 28 tests ✅
- **Integration**: 5 tests ✅
- **Quota Service**: 8 tests ✅
- **Logging Service**: 9 tests ✅
- **History Service**: 8 tests ✅
- **Adapter**: 5 tests ✅

**Frameworks**: Mocha for testing, Sinon for mocking VS Code APIs, and Axios/Nock for HTTP mocking.
**Location**: `src/test/suite/`

### Architecture
The extension follows a service-oriented architecture using the **Singleton Pattern**.

#### Core Services
- **SecretStorageService**: Secure persistence of API tokens using VS Code's `SecretStorage`.
- **HistoryService**: Tracks up to 24 history points per account in `globalState`.
- **LoggingService**: Handles structured logging with automatic secret masking.
- **QuotaService**: Manages API communication, caching, exponential backoff, and rate-limit state.

#### UI Components
- **QuotaStatusBar**: Aggregates usage across all accounts for the status bar.
- **AccountsProvider**: `TreeDataProvider` for the sidebar view.
- **DetailsView**: `WebviewPanel` for visual quota analytics using SVG.

#### Data Flow
```
User Action (Commands)
    ↓
QuotaService (Fetch/Retry/Cache/Backoff)
    ↓
HistoryService (Store data point)
    ↓
UI (StatusBar / TreeView / DetailsView)
```

## Troubleshooting

#### Status Bar shows "Loading..."
- Wait a few seconds for the initial fetch to complete.
- Check the **Output** panel for connectivity issues.

#### Account shows error icon (❌)
- Hover over the account to see the error message in the tooltip.
- Check the **Output** panel for detailed HTTP status codes or network errors.
- **Invalid Token**: Use "Edit Account" to update your API token.

#### Details View shows "No quota data available"
- The account might still be loading or failed its last fetch. Wait for a successful refresh.

#### History Chart not displaying
- The chart requires at least 2 data points to render a line.
- Points are collected automatically every time the data refreshes successfully.

#### Rate Limits triggering frequently
- The extension uses automatic exponential backoff (1s base, 2x multiplier).
- Check the **Output** panel for "Cooldown" messages indicating when the next fetch is allowed.

#### Extension not loading
- Ensure all dependencies are installed (`npm install`).
- Check the **Output** panel (Extension Host) for activation errors.

## Security

#### Token Storage
- API tokens are stored using VS Code's `SecretStorage`, which uses the OS keychain (e.g., Keychain on macOS, Credential Manager on Windows).
- Tokens are **never** stored in `settings.json` or plain text.
- History data is stored in `globalState` (non-sensitive).

#### Secret Masking
- The `LoggingService` automatically masks sensitive information in logs.
- Any object property containing `token`, `password`, `secret`, or `key` (case-insensitive) is replaced with `***`.

#### Best Practices
- Use dedicated API tokens with the minimum required scopes.
- Rotate your tokens regularly using the **Edit Account** command.
- Verify that tokens are not present in logs before sharing output.

## Manual QA Checklist

### Account Management
- [ ] **Add Account**: Verify token is requested securely (masked field) and account appears in tree.
- [ ] **Edit Account**: Update name and verify Tree View updates immediately.
- [ ] **Edit Token**: Update token with an invalid one, then back to a valid one. Verify error/success states.
- [ ] **Remove Account**: Verify account is removed from Tree View and Status Bar aggregation.
- [ ] **Validation**: Verify that empty account names are rejected.

### Error Handling & Resilience
- [ ] **Invalid Token**: Verify error icon (❌) and tooltip message (e.g., 401 Unauthorized).
- [ ] **Rate Limits**: Trigger multiple rapid refreshes; verify exponential backoff logs in Output panel.
- [ ] **Network Loss**: Disable internet; verify extension shows appropriate error instead of crashing.
- [ ] **Recovery**: Fix error condition; verify extension recovers on next refresh.

### Details View & History
- [ ] **Visuals**: Open Details View; verify usage bar color changes (try different usage levels).
- [ ] **History Chart**: Verify SVG chart line grows as new data points are collected.
- [ ] **FIFO Policy**: Verify that after 24 points, the oldest point is removed when a new one is added.
- [ ] **Persistence**: Restart VS Code; verify history and accounts persist.

### Security Verification
- [ ] **No Tokens in Settings**: Verify `settings.json` contains account URLs but NO tokens.
- [ ] **Log Masking**: Check Output panel; ensure all log entries have tokens masked (e.g., `token: "***"`).
- [ ] **Edit Account**: Verify old token is kept if the token input is left empty during an update.

### Multi-Account
- [ ] **Isolation**: Verify that rate limits or errors on one account do not affect others.
- [ ] **Aggregation**: Verify Status Bar correctly sums usage and limits across all active accounts.

## Mocks
For testing, you can use the provided mocks in `src/test/mocks/`:
- `antigravity.json`: Standard format.
- `alternate.json`: Custom format requiring adapter config.
- `rate-limit.json`: Simulated 429 error response.

## Packaging
```bash
npx vsce package
```
