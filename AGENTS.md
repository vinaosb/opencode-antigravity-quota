# AGENTS.md - OpenCode Quota Monitor

## Overview
This repository contains a VS Code extension for monitoring usage quotas across multiple OpenCode accounts.

## Build & Test
- **Compile**: `npm run compile` or `npm run watch` (tsc -watch)
- **Test**: `npm test` (Runs VS Code extension tests)
- **Lint**: `npm run lint` (ESLint)
- **Package**: `npx vsce package`

## Code Style & Conventions
- **Language**: TypeScript (Strict Mode enabled).
- **Async/Await**: Prefer async/await over promises.
- **Error Handling**: Use try/catch blocks. Surface user-friendly errors via `vscode.window.showErrorMessage`.
- **UI**: Use VS Code native UI components (StatusBar, TreeView, QuickPick) where possible.
- **Logging**: Use a dedicated `vscode.OutputChannel` for debug logs.
- **Secrets**: NEVER log secrets. Use `vscode.SecretStorage`.

## Project Structure
- `src/extension.ts`: Entry point.
- `src/services/`: Core logic (QuotaService, SecretStorageService).
- `src/models/`: Types and interfaces (Account, Quota).
- `src/ui/`: UI components (StatusBarItem, TreeDataProvider).
- `src/adapter/`: Adapters for different API response shapes.
- `test/`: Unit and integration tests.

## Key constraints
- Support multiple accounts.
- Secure credential storage.
- Resilient error handling (rate limits, network issues).

## Git Commit Strategy (Semantic Commits)

Follow **Conventional Commits** format: `<type>(<scope>): <subject>`

### Commit Types
- `docs`: Documentation changes (README, AGENTS.md, plan docs, notepads)
- `chore`: Maintenance tasks, dependency updates, boulder tracking
- `fix`: Bug fixes in source code
- `feat`: New features
- `refactor`: Code refactoring
- `test`: Test changes
- `ci`: CI/CD configuration changes

### Separating Concerns in Commits

**ALWAYS create separate commits for distinct concerns:**

1. **Documentation vs Chores**:
   - Documentation content → `docs: <scope> <message>`
   - Plan/completion tracking → `chore: boulder <message>`

2. **Multiple Documentation Sessions**:
   - One session per commit: `docs: <plan-name> add <description>`
   - Never combine multiple plans in one commit

3. **Source Code vs Documentation**:
   - Source code changes → `fix/feat/refactor/test: <scope> <message>`
   - Documentation only → `docs: <scope> <message>`
   - Never mix source and docs in same commit

4. **Plan Execution Workflow**:
   - Initial boulder update: `chore: boulder start <plan-name>`
   - Plan file creation: `docs: create <plan-name> plan`
   - Plan completion: `docs: <plan-name> complete <description>`
   - Boulder cleanup: `chore: boulder complete <plan-name>`

### Commit Message Examples

```
docs: add fix-missing-command plan with diagnostic workflow
docs: fix-missing-command document verification steps and troubleshooting
chore: boulder update fix-missing-command session tracking
docs: add previous session documentation for github-actions-auto-publish
```

### Verification Before Commit

- Check `git status` to see what's changed
- Group related changes (documentation, chore tasks)
- Create focused, atomic commits
- Never commit "documentation dump" - separate by plan/session
