### In-Flight Lock Implementation
- Used  to track active requests per account.
- Reusing the same promise for concurrent requests prevents duplicate API calls and race conditions.
-  block ensures the in-flight promise is removed from the map even on failure.
- Fixed flaky  test by using  to control time-dependent logic.
- Added  to  in  to ensure proper disposal of resources.
### In-Flight Lock Implementation
- Used Map to track active promises per account to prevent duplicate requests.
- Integrated QuotaService into extension subscriptions for automatic disposal.
- Improved test stability in DetailsView using fake timers.
## Concurrency Limiting with p-limit

- Successfully implemented concurrency limiting in `QuotaService.fetchAll()` using `p-limit`.
- Added `opencodeQuota.maxConcurrentRequests` configuration with a default value of 3.
- Verified that `p-limit` correctly restricts the number of simultaneous API requests.
- Integrated the configuration into `extension.ts` to allow user-defined limits.
- Added a dedicated test case in `quotaService.test.ts` to observe and verify concurrent request counts.
## Phase 1.4: Exponential Backoff with Jitter
- Implemented robust backoff logic in QuotaService.ts.
- Jitter range: ±20% of base delay + random 0-1000ms.
- Added error cache TTL (30s) to prevent immediate retries on persistent failures.
- Updated package.json with user-configurable backoff settings.
- Verified with unit tests using deterministic mocks (sandbox.stub(Math, 'random')).
### Phase 2.1: Error Caching
- Implemented separate errorCache Map in QuotaService with 30s TTL.
- Refactored QuotaService to use CacheEntry with expiresAt for both success and error caches.
- Implemented getCached method to check success cache then error cache.
- Updated doFetchQuota to use getCached and cache errors separately.
- Added tests to verify 30s error TTL and cache clearing.
- Verified all tests pass (89 passing).

### Header Masking Implementation (Phase 2.2)
- Added SENSITIVE_HEADER_NAMES to LoggingService to mask authorization, cookie, set-cookie, x-api-key, and x-auth-token.
- Extended LoggingService.maskSecrets to detect these headers case-insensitively.
- Implemented QuotaService.stripHeaders to recursively remove/mask sensitive headers and remove heavy objects (request, response) from axios errors.
- Updated QuotaService error handling to log stripped error objects.
- Added comprehensive tests in src/test/suite/headerMasking.test.ts.


### Phase 2.2: HTTP Timeout Hardening
- Increased default HTTP timeout from 5s to 30s (30000ms).
- Introduced new configuration setting `opencodeQuota.httpTimeoutMs` to allow users to customize timeout behavior.
- Updated `QuotaService` constructor to accept `httpTimeoutMs` and use it in axios requests.
- Ensured backward compatibility with a default value of 30s if not explicitly configured.
- Verified that existing tests pass with the new configuration.
## Phase 2.5: Import OpenCode Accounts
- Implemented OpenCodeAccount and OpenCodeAccountsFile interfaces.
- Added importOpenCodeAccounts() and importFromOpenCode() to SecretStorageService.
- Registered opencodeQuota.importFromOpenCode command in extension.ts and package.json.
- Updated README.md with instructions.
- Added comprehensive tests in importAccounts.test.ts.
- Verified that existing tests pass (95 total passing tests).
- Handled cross-platform path resolution for OpenCode accounts file (Windows %APPDATA% vs Unix ~/.config).
- Implemented duplicate account check during import.

## Documenting Hardening Features
- Updated README.md with comprehensive documentation for new resilience and security features.
- Added a Configuration Reference table for all new settings in package.json.
- Refined the Import OpenCode Accounts section with technical details about file paths.
- Updated Architecture and Troubleshooting sections to reflect recent improvements.
### Integration Testing Learnings
- Use `Object.create(Service.prototype)` or direct prototype method access when mocking complex services to preserve access to internal helpers if needed, but cleaner mocking of dependencies is usually better.
- Axios error stripping (`stripHeaders`) is critical for security but needs to be tested specifically for the fields it masks.
- VS Code `SecretStorage` mocking requires initializing the service with a mock context.
- Exponential backoff testing requires deterministic control over `Date.now()` and `Math.random()`.
- Total test count reached 111, exceeding the target of 110.

### Manual Verification Learnings
- Comprehensive integration tests can effectively simulate manual verification steps (concurrency bursts, error caching TTL, header masking) when a GUI environment is not available.
- Verification document serves as a "QA Certificate" ensuring all hardening features meet production standards before publishing.
