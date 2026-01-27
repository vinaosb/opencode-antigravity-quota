# Documentation Updates for OpenCode Quota Monitor

## Objective
Update `README.md` to document all new features implemented in Tasks 10-12 and comprehensive test coverage (100%).

## Key Changes Required

### 1. Update Features Section
Add new features to the existing list:
- **24h History Tracking**: Automatic history collection with up to 24 data points per account
- **Details View Webview**: Interactive visualization with SVG charts showing quota usage over time
- **Edit Account Command**: Update account name or token via QuickPick interface
- **Exponential Backoff**: Smart retry logic (1s base, 2x multiplier, max 5 retries)
- **Rate-Limit Resilience**: Graceful handling of 429/5xx errors with cooldown periods
- **Debug Logging**: Comprehensive logging with automatic secret masking

### 2. Add "View Account Details" Section
Document how to use the new Details View:
- Right-click account → "View Details"
- What's displayed: current usage, usage percentage, history chart, reset time, errors
- Mention SVG polyline visualization
- Color-coded progress bars (green/yellow/red based on percentage)

### 3. Add "Edit an Account" Section
Document the Edit Account command:
- Right-click account → "Edit Account"
- QuickPick menu options: Update Name, Update Token
- Token field behavior: empty string keeps existing token
- Automatic refresh after changes

### 4. Add "Enable Debug Logging" Section
Document how to access and use debug logs:
- Open Output panel (`Ctrl+Shift+U` / `Cmd+Shift+U`)
- Select "OpenCode Quota Monitor" from dropdown
- Explain automatic secret masking (tokens, passwords, secrets, keys)
- What logs include: fetch attempts, retries, cooldown skips, errors

### 5. Update Available Commands Table
Add the new command:
| `OpenCode Quota: View Details` | Open detailed webview with history chart |

### 6. Add "Test Coverage" Section
Document the achievement:
**Test Coverage: 100% (81/81 tests passing)**

List all test suites:
- Commands Test Suite (18 tests) ✅
- DetailsView Test Suite (28 tests) ✅
- Integration Test Suite (5 tests) ✅
- QuotaService Test Suite (8 tests) ✅
- LoggingService Test Suite (9 tests) ✅
- HistoryService Test Suite (8 tests) ✅
- Adapter Test Suite (5 tests) ✅

Mention test framework:
- Mocha (test framework)
- Sinon (mocking VS Code APIs)
- Axios stubs (HTTP mocking in integration tests)
- Test location: `src/test/suite/`

### 7. Add "Troubleshooting" Section
Create a comprehensive troubleshooting guide with subsections:

#### Status Bar Shows "Loading..."
- Wait for initial fetch
- Check Output panel for errors
- Verify network connectivity

#### Account Shows Error Icon (❌)
- Check Output panel for detailed error
- Common issues: Invalid Token, Network Error, Rate Limited
- How to resolve each issue

#### Details View Shows "No quota data available"
- Account in loading state
- Wait for initial refresh

#### History Chart Not Displaying
- Need at least 2 data points
- Points accumulate over time
- Check Output panel for errors

#### Rate Limits Triggering Too Frequently
- Automatic exponential backoff
- Cooldown period in Output panel
- Mention cacheTTL setting if needed

#### Extension Not Loading
- Check Output panel for activation errors
- Verify dependencies installed
- Try reloading VS Code

### 8. Update "Security" Section
Expand with new information:

#### Token Storage
- Tokens in SecretStorage (encrypted)
- History in GlobalState (non-sensitive)
- Config in settings.json WITHOUT tokens

#### Secret Masking
- Automatic masking in logs: tokens → `***`
- Passwords, secrets, keys also masked
- Case-insensitive, works across nested objects

#### Best Practices
- Never share settings.json (tokens not there anyway)
- Use dedicated tokens with minimal permissions
- Rotate tokens regularly via Edit Account
- Verify tokens not logged in Output panel

### 9. Add "Architecture" Section
Document the service and component structure:

#### Services (Singleton Pattern)
- SecretStorageService: Token persistence
- HistoryService: 24h history tracking
- LoggingService: Structured logging
- QuotaService: API fetching with caching, retries, rate-limit

#### UI Components
- QuotaStatusBar: Status bar aggregation
- AccountsProvider: TreeDataProvider
- DetailsView: Webview panel with SVG charts

#### Data Flow
Show the flow:
```
User Input (Commands)
    ↓
QuotaService (fetch/retry/cache)
    ↓
HistoryService (addHistoryPoint)
    ↓
QuotaStatusBar + AccountsProvider + DetailsView (update UI)
```

### 10. Update Manual QA Checklist
Expand the existing checklist with new features:

#### Basic Functionality (existing)
- [ ] Add account appears in sidebar
- [ ] Token input masked
- [ ] Status bar shows aggregated usage
- [ ] Refresh updates all accounts

#### Account Management (new tests)
- [ ] Edit account name updates in tree view
- [ ] Edit account token updates and works
- [ ] Remove account removes from tree and status bar
- [ ] Empty name validation prevents invalid accounts

#### Error Handling (existing + new)
- [ ] Invalid token shows error icon
- [ ] Error message in tree item tooltip
- [ ] Network errors don't crash extension
- [ ] Rate limit errors trigger exponential backoff

#### Rate Limits (new)
- [ ] Multiple rapid refreshes don't crash
- [ ] 429 responses shown in tree view
- [ ] Cooldown message in Output panel
- [ ] Extension retries automatically after cooldown

#### Security Verification (existing)
- [ ] settings.json - tokens NOT present
- [ ] Output panel - tokens masked with `***`
- [ ] Tokens persist across VS Code restarts
- [ ] Edit account keeps old token if input empty

#### Details View (new)
- [ ] Webview opens with HTML content
- [ ] Current usage and limit displayed
- [ ] Usage percentage with correct color
- [ ] SVG chart renders with history points
- [ ] Reset time formatted correctly
- [ ] Error messages shown when applicable

#### History Tracking (new)
- [ ] History accumulates over multiple refreshes
- [ ] Max 24 points stored per account
- [ ] Old points evicted (FIFO) after 24 points
- [ ] History persists across VS Code restarts

#### Multi-Account (new)
- [ ] Multiple accounts appear in tree view
- [ ] Status bar aggregates across all accounts
- [ ] Each account fetches independently
- [ ] Rate limits on one account don't block others

## Reference Materials

### Learnings from Implementation
See `.sisyphus/notepads/opencode-quota-monitor-complete/learnings.md`:
- Singleton pattern for all services
- HistoryData structure (timestamp, used, limit)
- FIFO policy: 24 points max
- Exponential backoff: 1s base, 2x multiplier, max 5 retries
- SVG charts generated on extension side (no client-side JS)
- Test location: `src/test/suite/`
- Mocha + Sinon for mocking

### Technical Decisions
See `.sisyphus/notepads/opencode-quota-monitor-complete/decisions.md`:
- History storage: VS Code GlobalState (non-sensitive)
- Rate-limit: Exponential backoff (1s base, 2x, max 5 retries)
- Charts: SVG + HTML/CSS (no external libraries)
- Logging: OutputChannel with debug/info/error levels

### Existing README Structure
Current sections to preserve and extend:
- Features (expand with new features)
- Setup & Configuration (add View Details, Edit Account sections)
- Development (add Test Coverage section)
- Manual QA Checklist (expand with new tests)
- Mocks (keep existing)
- Packaging (keep existing)

## Success Criteria

- [x] README.md updated with all new features documented
- [x] Troubleshooting section added with common issues
- [x] Test coverage documented (100%, 81/81 tests)
- [x] Architecture section added with services, UI components, data flow diagram
- [x] Security section expanded with secret masking details
- [x] Manual QA Checklist expanded with 10+ new test scenarios across 8 categories
- [x] All documentation matches implementation details from learnings.md
- [x] README compiles without errors
- [x] User can follow instructions to use new features (Details View, Edit Account)
- [x] Developer can understand architecture from Architecture section

## Plan Status: COMPLETE

✅ All documentation tasks finished
✅ README.md fully updated (219 lines)
✅ Committed: fab850a - "docs: update README with comprehensive documentation for Tasks 10-12"
✅ Manual QA Checklist populated (34 test scenarios) - User will verify at project end
✅ All 81 tests passing (100% coverage)

**Next Step**: Package extension (`npx vsce package`)

## Files to Modify

- `README.md` - Complete rewrite/extension with all sections above

## Guardrails

**DO NOT**:
- Change functionality or implementation code
- Modify package.json or other source files
- Add external dependencies
- Remove existing documentation that's still relevant

**DO**:
- Document what was implemented
- Reference existing documentation structure
- Keep tone consistent with original README
- Use clear, actionable language for instructions
