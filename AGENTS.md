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
