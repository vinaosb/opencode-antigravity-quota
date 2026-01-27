# OpenCode Quota Monitor - Complete Implementation Plan

## Context

### Original Request
Complete a VS Code extension that monitors Antigravity usage quotas across multiple accounts. The extension is partially built and needs missing features implemented: editAccount command, advanced details view with charts/history, comprehensive test coverage, enhanced rate-limit handling, and logging infrastructure.

### Interview Summary
**Key Discussions**:
- User wants **ALL missing features** implemented (not partial)
- Details view should be **advanced** with charts and history visualization
- Test coverage should be **comprehensive** (unit + integration)
- 24h usage history tracking is required
- Advanced rate-limit handling with exponential backoff is needed
- Must maintain secure credential storage (SecretStorage)
- Extension is integrated with opencode-antigravity-auth project

**Research Findings**:
- Project is ~60% complete with solid foundation
- All core services exist but need enhancements
- Test infrastructure set up (Mocha) but coverage limited
- Mock data provided for 2 API response formats
- No external dependencies can be added per requirements

**Technical Decisions**:
- History storage: VS Code GlobalState (non-sensitive data only)
- Rate-limit: Exponential backoff with per-account retry tracking
- Logging: Dedicated OutputChannel with debug/info/error levels
- Charts: Simple HTML/CSS (no external libraries to keep lightweight)
- Test approach: Comprehensive unit tests + integration tests with mocks

### Metis Review
**Identified Gaps** (addressed in plan):
- Chart specificity: Will implement line chart for history + progress bars for current
- History granularity: Using 24 hourly data points
- Edit scope: editAccount allows name and token modification
- Backoff parameters: 1s base, 2x multiplier, 5 max retries
- Edge cases: Comprehensive coverage in tasks
- Guardrails: Explicitly locked to prevent scope creep

**Key Guardrails Applied**:
- ❌ NO external chart libraries (HTML/CSS only)
- ❌ NO new npm dependencies
- ❌ NO breaking changes to existing APIs
- ❌ NO secrets in logs, tests, or GlobalState
- ❌ NO features beyond specified scope

---

## Work Objectives

### Core Objective
Complete the OpenCode Quota Monitor VS Code extension by implementing all missing features: editAccount command, advanced details webview with charts and history, 24h usage tracking, enhanced rate-limit handling with exponential backoff, debug logging, and comprehensive test coverage.

### Concrete Deliverables
- `editAccount` command implemented in extension.ts
- Advanced webview panel (DetailsView) with usage charts and history
- History tracking service storing 24 hourly data points per account in GlobalState
- Enhanced QuotaService with exponential backoff and per-account rate-limit state
- Debug logging service with OutputChannel
- Comprehensive test suite (unit + integration) with 80%+ coverage
- All existing features verified to continue working

### Definition of Done
- [ ] Extension activates without errors (`npm run compile` succeeds)
- [ ] All commands (refresh, add, remove, edit, openDetails) work end-to-end
- [ ] Status bar shows aggregated quota with error indicators
- [ ] Sidebar TreeView lists accounts with status icons
- [ ] Details view opens webview with charts and 24h history
- [ ] Credentials stored in SecretStorage, never in logs/GlobalState
- [ ] Exponential backoff retries failed requests with 1s/2x/5 retries
- [ ] Debug OutputChannel logs operations at appropriate levels
- [ ] `npm test` passes with 80%+ code coverage
- [ ] Manual QA checklist verified

### Must Have
- ✅ Multi-account support with secure token storage
- ✅ Status bar showing aggregated quota
- ✅ Sidebar TreeView with account statuses
- ✅ Configurable adapter for different API response shapes
- ✅ Manual and auto-refresh
- ✅ Basic error handling
- **ADD:** `editAccount` command for modifying account details
- **ADD:** Advanced details webview with usage visualization
- **ADD:** 24h usage history tracking and display
- **ADD:** Exponential backoff for rate-limit handling
- **ADD:** Per-account rate-limit state tracking
- **ADD:** Debug logging with OutputChannel
- **ADD:** Comprehensive test coverage (80%+)

### Must NOT Have (Guardrails)
- ❌ External charting libraries (Chart.js, D3, etc.) - HTML/CSS only
- ❌ Additional npm dependencies beyond current package.json
- ❌ Breaking changes to existing APIs or data formats
- ❌ Secrets in logs, tests, or GlobalState
- ❌ Account import/export functionality (not in requirements)
- ❌ Account grouping or tagging (not in requirements)
- ❌ Per-account refresh interval configuration (not in requirements)
- ❌ Push notifications beyond VS Code native (not in requirements)
- ❌ Custom dashboards beyond details view (not in requirements)
- ❌ Multi-language localization (not in requirements)
- ❌ Dark/light theme customization for webview (not in requirements)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (Mocha + @vscode/test-electron)
- **User wants tests**: YES (Comprehensive - unit + integration)
- **Framework**: Mocha (existing setup)

### Test Strategy

**Unit Tests** (for all services):
- Test individual service methods in isolation
- Mock external dependencies (vscode API, axios, SecretStorage)
- Cover all code paths including error cases
- Target: 80%+ line coverage

**Integration Tests**:
- Test command handlers with mocked API responses
- Test QuotaService integration with multiple accounts
- Test adapter with different response formats
- Test UI component interactions (TreeView, StatusBar updates)

**Test File Structure**:
```
test/suite/
  - quotaService.test.ts      (NEW - QuotaService unit tests)
  - secretStorage.test.ts     (NEW - SecretStorageService unit tests)
  - detailsView.test.ts        (NEW - DetailsView webview tests)
  - historyService.test.ts     (NEW - HistoryService tests)
  - loggingService.test.ts      (NEW - LoggingService tests)
  - commands.test.ts           (NEW - Command handler tests)
  - integration.test.ts        (NEW - End-to-end integration tests)
  - adapter.test.ts           (EXIST - keep and verify)
```

**If TDD Enabled**:

Each service will follow RED-GREEN-REFACTOR:

**Task Structure:**
1. **RED**: Write failing test first
   - Test file: `test/suite/[service].test.ts`
   - Test command: `npm test`
   - Expected: FAIL (test exists, implementation doesn't)
2. **GREEN**: Implement minimum code to pass
   - Command: `npm test`
   - Expected: PASS
3. **REFACTOR**: Clean up while keeping green
   - Command: `npm test`
   - Expected: PASS (still)

### Manual Execution Verification (ALWAYS include, even with tests)

**For Command/UI Changes:**
- [ ] Using Extension Development Host:
  - Command Palette: Execute `opencodeQuota.addAccount`
  - Verify: Input prompts appear (name, endpoint, token)
  - Verify: Account appears in TreeView sidebar
  - Verify: Status bar updates with aggregated quota

**For Details View (Webview):**
- [ ] Click account in TreeView → Open Details
  - Verify: Webview panel opens
  - Verify: Current quota displayed with progress bars
  - Verify: 24h history chart shows line graph
  - Verify: Last refresh timestamp shown

**For Error Handling:**
- [ ] Add account with invalid token
  - Verify: Tree item shows error icon
  - Verify: Status bar shows error background
  - Verify: Error message in OutputChannel

**For Rate-Limit:**
- [ ] Trigger multiple rapid refreshes
  - Verify: Exponential backoff delays retry (1s → 2s → 4s → 8s → 16s)
  - Verify: No crashes on rate limits
  - Verify: Error displayed in UI

**For Security:**
- [ ] Check `settings.json` → Confirm no tokens stored
- [ ] Check OutputChannel logs → Confirm tokens are masked
- [ ] Check test files → Confirm no production secrets

**Evidence Required:**
- [ ] Test output captured (copy-paste terminal output)
- [ ] Screenshots saved for visual verification (.sisyphus/evidence/*.png)

---

## Task Flow

```
Task 1: LoggingService setup
    ↓
Task 2: HistoryService implementation
    ↓
Task 3: QuotaService enhancements (backoff, rate-limit state)
    ↓
Task 4: DetailsView webview (charts + history display)
    ↓
Task 5: editAccount command
    ↓
Task 6: Integration in extension.ts (wiring new services)
    ↓
Task 7: LoggingService tests
    ↓
Task 8: HistoryService tests
    ↓
Task 9: QuotaService tests
    ↓
- [x] Task 10: DetailsView tests (all 28 tests passing)
    ↓
- [x] Task 11: Commands tests (all 18 tests passing)
    ↓
- [ ] Task 12: Integration tests (5 tests failing - requires complex debugging)
    ↓
Task 13: Manual QA verification
    ↓
Task 14: Documentation updates
```

## Parallelization

| Group | Tasks | Reason |
|-------|-------|--------|
| A | 7, 8, 9, 10 | Independent test files can be written in parallel |
| B | 11, 12 | Command + integration tests (after services tested) |

| Task | Depends On | Reason |
|------|------------|--------|
| 2 | 1 | HistoryService uses LoggingService |
| 3 | 2 | QuotaService needs HistoryService for 24h tracking |
| 4 | 2, 3 | DetailsView needs HistoryService and enhanced QuotaService |
| 5 | 3 | editAccount needs enhanced QuotaService |
| 6 | 4, 5 | Extension integration needs DetailsView and editAccount |
| 9 | 3 | QuotaService tests need enhanced QuotaService |
| 10 | 4 | DetailsView tests need webview implementation |
| 12 | 6, 9, 10, 11 | Integration tests need all services and UI |

---

## TODOs

### Phase 1: Core Service Enhancements

- [x] 1. Implement LoggingService

- [x] 2. Implement HistoryService

- [x] 3. Enhance QuotaService with Exponential Backoff and Rate-Limit State

- [x] 4. Implement DetailsView Webview with Charts and History

- [x] 5. Implement editAccount Command

- [x] 6. Integrate New Services in extension.ts

  **What to do**:
  - Import and initialize `LoggingService` in `activate()` method
  - Import and initialize `HistoryService` with ExtensionContext
  - Pass `LoggingService` instance to `QuotaService` constructor
  - Pass `HistoryService` instance to `QuotaService` constructor
  - Pass `HistoryService` instance to `DetailsView` constructor
  - Update `QuotaService` instantiation to accept new dependencies
  - Register `editAccount` command handler
  - Register `opencodeQuota.openDetails` to open `DetailsView` (not just JSON)
  - Ensure all existing commands still work (add, remove, refresh)
  - Test: Extension activates without errors

  **Must NOT do**:
  - Do not break existing commands (addAccount, removeAccount, refresh)
  - Do not change existing API signatures unnecessarily
  - Do not remove existing features

  **Parallelizable**: NO (depends on 4, 5)

  **References**:

  **Pattern References**:
  - `src/extension.ts:13-25` - Service initialization pattern
  - `src/extension.ts:67-81` - Command registration pattern

  **API/Type References**:
  - `vscode.ExtensionContext` - Extension activation context
  - `vscode.Disposable` - Disposables cleanup

  **Documentation References**:
  - `package.json:12-14` - Activation events (onStartupFinished)

  **External References**:
  - VS Code Extension API: Activation lifecycle

  **WHY Each Reference Matters**:
  - `extension.ts:13-25`: Shows how to initialize services on activation
  - `extension.ts:67-81`: Shows command registration pattern

  **Acceptance Criteria**:

  **If TDD (tests enabled):**
  - [ ] Test file created: `test/suite/integration.test.ts`
  - [ ] Test covers: Extension activation without errors
  - [ ] Test covers: All services initialized correctly
  - [ ] Test covers: All commands registered
  - [ ] `npm test` → PASS (3 tests, 0 failures)

  **Manual Execution Verification**:
  - [ ] Run `npm run compile` → Verify: No TypeScript errors
  - [ ] Run extension in Extension Development Host
  - [ ] Command Palette → Verify: All 5 commands listed
  - [ ] OutputChannel → Verify: "Extension activated" logged
  - [ ] Test each command → Verify: All work without errors
  - [ ] Screenshot: Save evidence to `.sisyphus/evidence/6-command-palette.png`

  **Evidence Required**:
  - [ ] Compile output: `npm run compile` succeeds with 0 errors
  - [ ] Test output: `npm test` shows all passing tests
  - [ ] Screenshot of command palette showing all 5 commands
  - [ ] OutputChannel screenshot showing activation log

  **Commit**: YES
  - Message: `refactor(extension): integrate new services and editAccount command`
  - Files: `src/extension.ts`, `test/suite/integration.test.ts`
  - Pre-commit: `npm test && npm run lint`

### Phase 4: Comprehensive Testing

- [ ] 7. LoggingService Tests (Already done in Task 1)

  **Status**: Completed in Task 1

  **Verification**:
  - [ ] All tests pass: `npm test -- test/suite/loggingService.test.ts`
  - [ ] Code coverage: ≥80% for LoggingService

- [ ] 8. HistoryService Tests (Already done in Task 2)

  **Status**: Completed in Task 2

  **Verification**:
  - [ ] All tests pass: `npm test -- test/suite/historyService.test.ts`
  - [ ] Code coverage: ≥80% for HistoryService

- [ ] 9. QuotaService Tests (Already done in Task 3)

  **Status**: Completed in Task 3

  **Verification**:
  - [ ] All tests pass: `npm test -- test/suite/quotaService.test.ts`
  - [ ] Code coverage: ≥80% for QuotaService

- [ ] 10. DetailsView Tests (Already done in Task 4)

  **Status**: Completed in Task 4

  **Verification**:
  - [ ] All tests pass: `npm test -- test/suite/detailsView.test.ts`
  - [ ] Code coverage: ≥80% for DetailsView

- [ ] 11. Command Handler Tests (Already done in Task 5)

  **Status**: Completed in Task 5

  **Verification**:
  - [ ] All tests pass: `npm test -- test/suite/commands.test.ts`
  - [ ] Code coverage: ≥80% for command handlers

- [ ] 12. Integration Tests

  **What to do**:
  - Create `test/suite/integration.test.ts`
  - Test 1: End-to-end account lifecycle (add → edit → remove)
  - Test 2: Multi-account scenario with rate limits
  - Test 3: Details view with history data
  - Test 4: Auto-refresh with multiple accounts
  - Test 5: Error recovery (invalid token → fix token → retry)
  - Mock VS Code APIs (window, workspace, commands)
  - Mock API responses with nock or axios-mock-adapter

  **Must NOT do**:
  - Do not make real network requests in tests
  - Do not use production secrets in tests
  - Do not modify user's actual SecretStorage/GlobalState

  **Parallelizable**: YES (with 7, 8, 9, 10, 11)

  **References**:

  **Pattern References**:
  - `src/test/suite/adapter.test.ts:1-40` - Test file structure
  - `src/test/runTest.ts:1-23` - Test runner setup

  **API/Type References**:
  - Mocha: `describe`, `it`, `beforeEach`, `afterEach`
  - Assert: `assert.strictEqual`, `assert.ok`

  **Documentation References**:
  - VS Code Testing API: https://code.visualstudio.com/api/working-with-extensions/testing-extension

  **External References**:
  - Nock: https://github.com/nock/nock - HTTP mocking (optional, or use jest-mock-axios)
  - Axios mocking: https://github.com/ctimmerm/axios-mock-adapter

  **WHY Each Reference Matters**:
  - `adapter.test.ts`: Shows test file structure to follow
  - `runTest.ts`: Shows how to set up VS Code extension tests
  - Nock/Axios mocking: How to mock HTTP requests in tests

  **Acceptance Criteria**:

  **If TDD (tests enabled):**
  - [ ] Test file created: `test/suite/integration.test.ts` (if not already)
  - [ ] Test 1: Add → Edit → Remove account workflow
  - [ ] Test 2: Multiple accounts with different rate-limit states
  - [ ] Test 3: Details view displays history chart
  - [ ] Test 4: Auto-refresh updates all accounts
  - [ ] Test 5: Error recovery after token fix
  - [ ] `npm test` → PASS (5 tests, 0 failures)

  **Manual Execution Verification**:
  - [ ] Run full test suite: `npm test`
  - [ ] Verify: All tests pass (integration + unit tests)
  - [ ] Check coverage: Verify ≥80% overall coverage
  - [ ] Test output saved: Copy terminal output to `.sisyphus/evidence/7-test-output.txt`

  **Evidence Required**:
  - [ ] Test output: `npm test` shows all tests passing
  - [ ] Coverage report: ≥80% line coverage
  - [ ] Terminal output captured in evidence file

  **Commit**: YES
  - Message: `test(integration): add comprehensive integration tests`
  - Files: `test/suite/integration.test.ts`
  - Pre-commit: `npm test`

### Phase 5: Manual QA and Documentation

- [ ] 13. Manual QA Verification

  **What to do**:
  - Execute Manual QA Checklist from README
  - Test 1: Add Account - Verify secure token input, TreeView update
  - Test 2: Refresh - Verify Status Bar updates, no errors
  - Test 3: Invalid Token - Verify error icon, Status Bar error background
  - Test 4: Rate Limits - Verify no crashes, exponential backoff works
  - Test 5: Security - Check settings.json (no tokens), OutputChannel (masked tokens)
  - Test 6: Edit Account - Verify name and token changes work
  - Test 7: Details View - Verify webview opens, charts display, history shows
  - Test 8: Multiple Accounts - Verify all accounts appear, aggregation works
  - Test 9: Auto-Refresh - Verify automatic updates at configured interval
  - Test 10: Remove Account - Verify account disappears, history cleared

  **Must NOT do**:
  - Do not skip any QA items
  - Do not proceed without fixing failing QA items

  **Parallelizable**: NO (final verification)

  **References**:

  **Pattern References**:
  - `README.md:42-50` - Existing Manual QA Checklist

  **Documentation References**:
  - `README.md:1-50` - Complete README with setup instructions

  **External References**:
  - None (manual testing)

  **WHY Each Reference Matters**:
  - `README.md:42-50`: Defines the manual QA checklist to execute

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] QA Item 1 (Add Account): ✅ Pass
  - [ ] QA Item 2 (Refresh): ✅ Pass
  - [ ] QA Item 3 (Invalid Token): ✅ Pass
  - [ ] QA Item 4 (Rate Limits): ✅ Pass
  - [ ] QA Item 5 (Security): ✅ Pass
  - [ ] QA Item 6 (Edit Account): ✅ Pass
  - [ ] QA Item 7 (Details View): ✅ Pass
  - [ ] QA Item 8 (Multiple Accounts): ✅ Pass
  - [ ] QA Item 9 (Auto-Refresh): ✅ Pass
  - [ ] QA Item 10 (Remove Account): ✅ Pass
  - [ ] Screenshot each test: Save to `.sisyphus/evidence/qa-*.png`
  - [ ] Create QA report: `.sisyphus/evidence/qa-report.md`

  **Evidence Required**:
  - [ ] QA report: Markdown file with all test results
  - [ ] 10+ screenshots showing successful tests
  - [ ] All QA items marked as ✅ Pass

  **Commit**: NO (documentation only)
  - Message: N/A (manual QA, no code changes)

- [ ] 14. Update Documentation

  **What to do**:
  - Update README.md with new features:
    - Edit Account command documentation
    - Details View (webview) documentation with screenshots
    - 24h history tracking explanation
    - Advanced rate-limit handling explanation
    - Debug logging instructions (how to open OutputChannel)
  - Update AGENTS.md if needed
  - Ensure setup instructions are clear and copyable
  - Verify all commands are documented
  - Add troubleshooting section for common issues
  - Update "How to test locally" section

  **Must NOT do**:
  - Do not remove existing documentation
  - Do not add features not implemented

  **Parallelizable**: NO (final documentation)

   **References**:

   **Pattern References**:
   - `README.md:1-50` - Existing documentation structure

   **Documentation References**:
   - Original prompt requirements: "README.md with 'How to configure' and 'How to run locally'"
   - `.sisyphus/plans/documentation-updates.md` - Detailed documentation update plan (all changes listed)

   **External References**:
   - None (documentation)

   **WHY Each Reference Matters**:
   - `README.md`: Need to follow existing documentation structure
   - `.sisyphus/plans/documentation-updates.md`: Complete list of all documentation updates with 10 major sections to add/expand

  **Acceptance Criteria**:

  **Manual Execution Verification**:
  - [ ] README updated with editAccount command
  - [ ] README updated with Details View section
  - [ ] README updated with 24h history tracking
  - [ ] README updated with rate-limit handling
  - [ ] README updated with logging instructions
  - [ ] All setup commands are copyable and tested
  - [ ] Screenshots included for major features
  - [ ] Troubleshooting section added
  - [ ] Read README from fresh perspective → Verify: Clear and complete

  **Evidence Required**:
  - [ ] README.md updated with all new sections
  - [ ] Screenshots added (or described where to add)
  - [ ] Manual verification: README is clear and complete

  **Commit**: YES
  - Message: `docs: update README with new features and documentation`
  - Files: `README.md`
  - Pre-commit: None (documentation)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1, 2 | `feat(logging): add LoggingService with OutputChannel` | `src/services/LoggingService.ts`, `test/suite/loggingService.test.ts` | `npm test` |
| 1, 2 | `feat(history): add HistoryService with 24h tracking in GlobalState` | `src/services/HistoryService.ts`, `test/suite/historyService.test.ts` | `npm test` |
| 3 | `feat(quota): add exponential backoff and rate-limit state tracking` | `src/services/QuotaService.ts`, `test/suite/quotaService.test.ts` | `npm test` |
| 4 | `feat(ui): add DetailsView webview with charts and history` | `src/ui/DetailsView.ts`, `src/ui/detailsView.css`, `test/suite/detailsView.test.ts` | `npm test` |
| 5 | `feat(commands): add editAccount command` | `src/extension.ts`, `test/suite/commands.test.ts` | `npm test` |
| 6 | `refactor(extension): integrate new services and editAccount command` | `src/extension.ts`, `test/suite/integration.test.ts` | `npm test && npm run lint` |
| 12 | `test(integration): add comprehensive integration tests` | `test/suite/integration.test.ts` | `npm test` |
| 14 | `docs: update README with new features and documentation` | `README.md` | None |

---

## Success Criteria

### Verification Commands
```bash
# Compile TypeScript
npm run compile
# Expected: No errors, out/ directory created

# Run all tests
npm test
# Expected: All 81 tests pass (100%), 80%+ coverage

# Run linter
npm run lint
# Expected: No errors or warnings

# Package extension
npx vsce package
# Expected: .vsix file created successfully
```

### Final Checklist
- [ ] All "Must Have" features implemented
- [ ] All "Must NOT Have" exclusions respected
- [ ] All 81 tests pass (100% coverage across 7 test suites)
- [ ] Integration tests cover end-to-end workflows (5 tests)
- [ ] Documentation updated with all new features
- [ ] README.md is comprehensive and user-friendly
- [ ] All integration tests pass (5+ tests)
- [ ] Code coverage ≥80%
- [ ] Extension activates without errors
- [ ] Status bar shows aggregated quota
- [ ] Sidebar lists accounts with status icons
- [ ] Details view webview opens with charts and history
- [ ] editAccount command works
- [ ] Credentials stored in SecretStorage (never in GlobalState/logs)
- [ ] Exponential backoff works (1s → 2s → 4s → 8s → 16s)
- [ ] Manual QA checklist verified (all 10 items pass)
- [ ] README updated with complete documentation
- [ ] No TypeScript compilation errors
- [ ] No ESLint warnings or errors
- [ ] No external dependencies added
- [ ] All existing features still work

---

## Appendix: Mock Data Files

### Existing Mocks (Already Present)
- `src/test/mocks/antigravity.json` - Standard Antigravity API response
- `src/test/mocks/alternate.json` - Alternate API response format

### New Mock Files (To Create)
- `src/test/mocks/rate-limit.json` - 429 rate-limit response
- `src/test/mocks/server-error.json` - 500 server error response
- `src/test/mocks/24h-history.json` - Sample history data array

### Mock File Examples

**rate-limit.json**:
```json
{
  "error": "Too Many Requests",
  "retry_after": 60
}
```

**server-error.json**:
```json
{
  "error": "Internal Server Error",
  "code": 500
}
```

**24h-history.json**:
```json
[
  { "timestamp": "2026-01-25T22:00:00Z", "used": 1450, "limit": 5000 },
  { "timestamp": "2026-01-25T21:00:00Z", "used": 1400, "limit": 5000 },
  { "timestamp": "2026-01-25T20:00:00Z", "used": 1350, "limit": 5000 }
]
```
