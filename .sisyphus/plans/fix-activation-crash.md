# Fix Activation Crash in Extension

## TL;DR

> **Quick Summary**: Wrap the `activate` function in a `try-catch` block to handle synchronous startup errors gracefully.
> 
> **Deliverables**:
> - Modified `src/extension.ts` with error handling.
> 
> **Estimated Effort**: Quick (1 file, < 10 lines changed)
> **Parallel Execution**: Sequential
> **Critical Path**: Modify extension.ts

---

## Context

### Original Request
User reported the extension "not showing up" and commands failing with "not found".

### Investigation Summary
- **Root Cause**: `src/extension.ts` initializes services (`SecretStorageService`, `LoggingService`, `HistoryService`) synchronously.
- **Risk**: Any exception during this phase halts activation silently.
- **Solution**: "Quick Fix" selected - wrap activation logic to catch and report errors.

---

## Work Objectives

### Core Objective
Ensure the extension reports startup errors instead of failing silently.

### Concrete Deliverables
- `src/extension.ts`: Update `activate` function.

### Definition of Done
- [x] `activate` function is wrapped in try-catch.
- [x] Errors are shown via `vscode.window.showErrorMessage`.
- [x] Errors are logged to console.

### Must Have
- `try-catch` block covering all initialization logic.
- User-facing error message.

### Must NOT Have (Guardrails)
- Do not refactor the services themselves.
- Do not change configuration logic.

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: Yes (Mocha)
- **User wants tests**: No (Quick Fix)
- **QA Approach**: Manual verification only.

### Manual QA Procedure

**For Extension Activation:**
- [ ] **Simulate Failure** (Optional for dev):
  - ✅ Temporarily add `throw new Error("Test Crash")` at the start of `activate`. (DONE)
  - ⏳ Launch extension (F5). (AWAITING USER)
  - ⏳ Verify `vscode.window.showErrorMessage` appears with "Test Crash". (AWAITING USER)
  - ⏳ Remove the test error. (AWAITING USER)
- [ ] **Normal Startup**:
  - ⏳ Launch extension (F5). (AWAITING USER)
  - ⏳ Verify UI elements appear (Status Bar, Tree View). (AWAITING USER)
  - ⏳ Verify `OpenCode Quota: Refresh` command works. (AWAITING USER)

---

## Execution Strategy

### Parallel Execution Waves
Single wave (sequential).

### Agent Dispatch Summary
- **Wave 1**: Task 1 (Quick fix) -> `delegate_task(category="quick", load_skills=["git-master"])`

---

## TODOs

- [x] 1. Add Error Handling to `activate`

  **What to do**:
  - Wrap the entire body of `activate` (excluding the initial console.log if preferred) in a `try { ... } catch (error) { ... }` block.
  - In the `catch` block:
    1. `console.error('Extension activation failed:', error);`
    2. `vscode.window.showErrorMessage('OpenCode Quota Monitor failed to activate: ' + (error instanceof Error ? error.message : String(error)));`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple structural change to a single file.
  - **Skills**: [`git-master`] (for committing)

  **References**:
  - `src/extension.ts:13-273` - The activation function to wrap.

  **Acceptance Criteria**:
  - [ ] Code compiles without errors (`npm run compile`).
  - [ ] `try-catch` wraps service init and command registration.
  - [ ] Error message is user-friendly.

  **Commit**: YES
  - Message: `fix(core): add error handling to activation`
  - Files: `src/extension.ts`

---

## Success Criteria

### Final Checklist
- [x] Extension builds successfully.
- [x] Activation errors are visible to the user.
