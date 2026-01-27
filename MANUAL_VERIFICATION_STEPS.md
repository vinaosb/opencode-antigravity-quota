# Manual Verification Steps for Hardening Features

This document provides step-by-step instructions for manually verifying the hardening features implemented in the OpenCode Quota Monitor extension.

## 1. Prerequisites
- VS Code installed
- OpenCode Quota Monitor extension installed and enabled
- Open the Output panel (`Ctrl+Shift+U` / `Cmd+Shift+U`) and select **OpenCode Quota Monitor** from the dropdown.

---

## 2. Concurrency Limiting
**Objective**: Verify that the extension throttles concurrent API requests to prevent overwhelming the server.

### Steps:
1. Add 10 or more accounts to the extension.
2. Click the **Refresh** button in the sidebar title bar to trigger a global refresh.
3. Observe the logs in the Output panel.
4. **Expected Result**: 
   - You should see "Fetching quota for..." messages appearing in groups (max 3 at a time by default).
   - Some accounts should show "Loading..." in the sidebar while others are already finished or waiting.
   - Total time to refresh all accounts should be roughly `(Total Accounts / Max Concurrent) * Request Delay`.

---

## 3. Backoff with Jitter
**Objective**: Verify that the extension uses exponential backoff with jitter when encountering rate limits (429 errors).

### Steps:
1. Configure an account with an endpoint that triggers a 429 error (or wait for a natural rate limit).
2. Trigger a refresh for that account.
3. Observe the logs in the Output panel.
4. **Expected Result**:
   - You should see a log entry: `Rate limit cooldown set for [Account Name]: retry 1/8, delay [X]ms`.
   - The delay `[X]` should be around 10 seconds (default base) plus or minus jitter.
   - Subsequent retries should show increasing delays (exponentially: 20s, 40s, etc.), capped at 5 minutes.
   - The "Next retry at" timestamp should be clearly logged.

---

## 4. Error Caching
**Objective**: Verify that error responses are cached for a short duration to reduce unnecessary retries.

### Steps:
1. Trigger an error for an account (e.g., provide an invalid token or point to a non-existent endpoint).
2. Verify the account shows an error icon (❌) in the sidebar.
3. Immediately (within 30 seconds) click the **Refresh** button for that specific account.
4. Observe the logs in the Output panel.
5. **Expected Result**:
   - You should see a log entry: `Returning cached error for [Account Name] (expires in [X]s)`.
   - No new network request should be fired during this 30-second window.
   - After 30 seconds, a refresh should trigger a new network request.

---

## 5. Header Masking
**Objective**: Verify that sensitive headers (like `Authorization`) are masked in the logs to prevent security leaks.

### Steps:
1. Trigger an authentication error (e.g., use an invalid token).
2. Observe the logs in the Output panel.
3. **Expected Result**:
   - Locate the log entry for the failed request.
   - The `Authorization` header value must be masked as `***`.
   - Other sensitive keys like `token`, `password`, `secret`, or `key` should also be masked.
   - Example log: `"headers": { "Authorization": "***", "User-Agent": "..." }`.

---

## 6. HTTP Timeout
**Objective**: Verify that the extension respects the configured HTTP timeout.

### Steps:
1. Use a tool (like a mock server or network throttler) to simulate a slow network or a non-responsive endpoint.
2. Trigger a refresh.
3. **Expected Result**:
   - The request should timeout after 30 seconds (default).
   - The log should show a timeout error (e.g., `timeout of 30000ms exceeded`).
   - The extension should handle this gracefully and show an error state (❌).

---

## 7. Import OpenCode Accounts
**Objective**: Verify that accounts can be imported from the OpenCode `antigravity-accounts.json` file.

### Steps:
1. Ensure the OpenCode `antigravity-accounts.json` file exists in the correct location:
   - **Windows**: `%APPDATA%\opencode\antigravity-accounts.json`
   - **Linux/macOS**: `~/.config/opencode/antigravity-accounts.json`
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run `OpenCode Quota: Import OpenCode Accounts`.
4. **Expected Result**:
   - A confirmation dialog should show the number of detected accounts.
   - After clicking "Import", the accounts should immediately appear in the Tree View.
   - The accounts should be functional (able to fetch quota if the refresh tokens are still valid).
   - Check the logs to confirm: `Imported [N] OpenCode accounts: [Account Names]`.

---

## 8. Polling Interval Guardrails
**Objective**: Verify that the extension enforces a minimum polling interval.

### Steps:
1. Open settings and set `opencodeQuota.pollIntervalMs` to a value less than `60000` (60 seconds).
2. Restart VS Code or reload the window.
3. **Expected Result**:
   - A warning message should appear: `Refresh interval too low. Using minimum of 60s to prevent API abuse.`
   - The extension should automatically use 60 seconds as the polling interval.

---

## Troubleshooting

### No logs appearing in Output panel
- Ensure you have selected **OpenCode Quota Monitor** from the dropdown menu in the Output panel.
- Check if the extension is activated (try running an extension command).

### Import command fails
- Verify that the `antigravity-accounts.json` file is correctly formatted and in the expected location.
- Check the Output panel for specific file access errors (ENOENT, Permission denied).

### Rate limit cooldown not resetting
- The cooldown is persistent during the session. Wait for the `nextRetryTime` logged in the Output panel.
- Restarting VS Code will reset the rate limit state for all accounts.

---
Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)
