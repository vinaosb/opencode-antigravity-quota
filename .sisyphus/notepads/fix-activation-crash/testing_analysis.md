# Analysis: VS Code Extension Testing Strategy

**Goal**: Automate or improve manual QA testing for extension, then plan commit and publishing.

**Date**: 2026-01-28  
**Context**: Currently on `fix-activation-crash` boulder with manual QA pending.

---

## Documentation Review

**VS Code Testing Documentation**: https://code.visualstudio.com/api/working-with-extensions/testing-extension

**Key Approaches**:

### 1. `@vscode/test-cli` (Newer, Recommended)
**Setup**:
```bash
npm install --save-dev @vscode/test-cli @vscode/test-electron
```

**Usage**:
- Create `.vscode-test.js` or `.vscode-test.mjs` configuration file
- Run tests with `vscode-test` command
- Downloads and runs VS Code in "Extension Development Host"
- Full access to VS Code API in tests

**Example Config**:
```javascript
const { defineConfig } = require('@vscode/test-cli');
module.exports = defineConfig({ 
    files: 'out/test/**/*.test.js' 
});
```

### 2. Custom Test Runner with `@vscode/test-electron` (Older, More Flexible)
**Setup**:
```typescript
import { runTests } from '@vscode/test-electron';
await runTests({ 
    extensionDevelopmentPath, 
    extensionTestsPath 
});
```

**Features**:
- Custom workspace folders
- Install other extensions before testing
- More granular control over launch arguments

---

## Current Codebase State

**Test Infrastructure Assessment**:
- ✅ **ALREADY EXISTS**: Test infrastructure is fully set up!
- ✅ `@vscode/test-electron` installed (v2.3.0)
- ✅ Test runner exists: `src/test/runTest.ts`
- ✅ Test suite entry: `src/test/suite/index.ts`
- ✅ 18 test files found in `src/test/suite/`
- ✅ Test script configured: `"test": "node ./out/test/runTest.js"`

**Existing Test Files**:
- `integration.test.ts` - Integration tests
- `commands.test.ts` - Command tests
- `adapter.test.ts` - Adapter tests
- `quotaService.test.ts` - Quota service tests
- `historyService.test.ts` - History service tests
- `loggingService.test.ts` - Logging service tests
- `headerMasking.test.ts` - Header masking tests
- `hardening-integration.test.ts` - Hardening integration tests
- `importAccounts.test.ts` - Import accounts tests
- `jitter.test.ts` - Jitter tests
- `detailsView.test.ts` - Details view tests
- `index-integration.ts` - Index integration tests
- Plus mock files: `rate-limit.json`, `alternate.json`, `antigravity.json`

**Existing Scripts** (from package.json):
- `"test": "node ./out/test/runTest.js"` - Runs existing test suite
- `"pretest": "npm run compile && npm run lint"` - Pre-test checks

---

## Potential Testing Strategies

### Strategy A: Quick Manual Automation (Recommended for Current Situation)
**Goal**: Automate the existing manual QA tasks without full test infrastructure

**Approach**:
1. Create simple activation test that catches errors
2. Run tests via VS Code debug or F5
3. Use `vscode.window` API to verify activation

**Pros**:
- Quick to implement
- No major dependency changes
- Can test error handling specifically
- Can verify normal activation works

**Cons**:
- Not as comprehensive as full test suite
- Still requires some manual observation

### Strategy B: Full Test Infrastructure Setup (Long-term)
**Goal**: Complete integration test suite

**Approach**:
1. Install `@vscode/test-electron`
2. Create test runner script (`src/test/runTest.ts`)
3. Write integration tests for activation and error handling
4. Update package.json scripts

**Pros**:
- Automated, repeatable testing
- Can run in CI/CD
- Full VS Code API access
- Can test commands, tree views, status bar

**Cons**:
- More setup time
- Additional dependencies
- Overkill for current quick fix

---

## Recommended Path

**For Current Boulder (fix-activation-crash)**:
- Use Strategy A: Quick activation test
- Verify error handling with minimal setup
- Then move to commit and publish planning

**For Future Work**:
- Consider Strategy B: Full test infrastructure
- Add comprehensive integration tests
- Enable CI/CD pipeline

---

## Next Steps

1. ✅ Review current test infrastructure (in progress)
2. ⏳ Check package.json for existing test scripts
3. ⏳ Decide on testing strategy (A or B)
4. ⏳ Implement chosen strategy
5. ⏳ Run tests to verify error handling works
6. ⏳ Plan for commit and publish
