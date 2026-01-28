# Cleanup and Publish Plan - REVISED

> **Revised based on Metis review**  
> Session ID: ses_3fc7abff5ffe5RV9dhYdNUV1zy  
> Date: 2026-01-28

---

## TL;DR

> **Quick Summary**: Remove test error, version bump to 0.0.3, add CHANGELOG.md, prepare icon, then publish to marketplace.
> 
> **Deliverables**:
> - Clean extension.ts (test error removed)
> - CHANGELOG.md with activation fix entry
> - Icon (128x128 PNG) added
> - Version bumped to 0.0.3
> - Published to marketplace
> 
> **Estimated Effort**: Medium (35 minutes)
> **Parallel Execution**: Sequential
> **Critical Path**: Cleanup → Icon → Version → Tests → Publish

---

## Context

### Metis Review Findings

**Assessment**: Market readiness check identified gaps:

**Ready**:
- ✅ Publisher exists: "vinaosb" in package.json
- ✅ README.md comprehensive
- ✅ Repository URL configured
- ✅ License specified (MIT)
- ✅ Engine compatibility correct
- ✅ Test suite: 114 tests passing
- ✅ Error handler verified working

**Missing**:
- ❌ CHANGELOG.md (REQUIRED for marketplace)
- ❌ Icon not configured (RECOMMENDED for professional appearance)
- ❌ Gallery banner not configured (optional)

**Test Coverage**:
- ✅ Verdict: Sufficient
- ✅ 114 tests cover all functionality
- ✅ Activation-specific test not needed (manual F5 is better validation)

---

## Work Objectives

### Core Objective
Cleanup test artifacts, prepare marketplace assets, and publish v0.0.3 to VS Code Marketplace.

### Concrete Deliverables
- `src/extension.ts`: Remove test error (line 15)
- `CHANGELOG.md`: Create with activation fix entry
- `icon.png`: Create 128x128 PNG for marketplace
- `package.json`: Bump version to 0.0.3
- `.vsix`: Package and validate with vsce
- Published: Extension available in marketplace

### Definition of Done
- [x] Test error removed
- [x] CHANGELOG.md created
- [x] Icon created and added to package.json
- [x] Version bumped to 0.0.3
- [x] All 114 tests pass
- [x] VSIX packages successfully
- [ ] Extension tested locally (F5)
- [ ] Extension published to marketplace

### Must Have
- Remove `throw new Error("Test Crash");` from line 15
- Create CHANGELOG.md (marketplace requirement)
- Version bump to 0.0.3 (patch for bug fix)
- Create icon (128x128 PNG minimum)
- Verify publisher PAT has correct scope
- Test vsce package before publishing

### Must NOT Have (Guardrails)
- Do NOT modify error handling implementation
- Do NOT remove try-catch block
- Do NOT change any other functionality
- Do NOT use SVG icon (marketplace rejects SVG)
- Do NOT skip CHANGELOG.md
- Do NOT publish without testing

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: Yes (Mocha + @vscode/test-electron)
- **User wants tests**: Yes
- **QA Approach**: Automated + Manual verification
- **Framework alignment**: Follows VS Code Extension Testing Guide (https://code.visualstudio.com/api/working-with-extensions/testing-extension)

### Automated Tests

**After Cleanup**:
```bash
npm run compile          # Verify compilation
npm test                # Run all 114 tests
vsce package            # Validate VSIX generation
```

**Test Framework Alignment** (per VS Code official guidelines):
- The project follows VS Code extension testing best practices from https://code.visualstudio.com/api/working-with-extensions/testing-extension
- Uses `@vscode/test-electron` for integration testing (as documented in official guide)
- Test runner configured at `src/test/runTest.ts` (standard pattern from official samples)
- Tests run in Extension Development Host (recommended approach from official docs)
- Mocha test framework (recommended by VS Code documentation)

**Expected Results**:
- ✅ 0 TypeScript errors
- ✅ 114 tests pass
- ✅ `.vsix` file generated successfully
- ✅ No validation errors from vsce

### Manual Verification

**Extension Activation**:
1. Press `F5` to launch extension
2. ✅ Expected: Extension activates without errors
3. ✅ Expected: Status bar shows quota information
4. ✅ Expected: Commands available in Command Palette
5. ✅ Expected: Tree view visible in sidebar

**VSIX Installation**:
1. Command Palette → "Extensions: Install from VSIX"
2. Select generated `.vsix` file
3. ✅ Expected: Extension installs successfully
4. ✅ Expected: Quota Monitor appears in extensions list

---

## Execution Strategy

### Parallel Execution Waves
Single wave (sequential).

### Agent Dispatch Summary
- **Wave 1**: Task 1-4 (Cleanup, CHANGELOG, Icon, Version) → `delegate_task(category="quick")`
- **Wave 2**: Task 5-6 (Tests, Package) → `delegate_task(category="quick")`
- **Wave 3**: Task 7-8 (Manual test, Publish) → User verification

---

## TODOs

- [x] 1. Remove Test Error

  **What to do**:
  - Remove `throw new Error("Test Crash");` from line 15 of `src/extension.ts`

  **Acceptance Criteria**:
  - [x] Line 15 removed: `throw new Error("Test Crash");`

- [x] 2. Create CHANGELOG.md

  **What to do**:
  - Create `CHANGELOG.md` file documenting activation error fix
  - Use semantic versioning format
  - Include all notable changes

  **Acceptance Criteria**:
  - [x] CHANGELOG.md created in project root
  - [x] Contains v0.0.3 entry with activation fix
  - [x] Contains v0.0.2 summary (previous release)

- [x] 3. Create Extension Icon

  **What to do**:
  - Create 128x128 PNG icon with concrete specifications
  - Use VS Code blue theme colors: Primary #007ACC, Accent #4FC1FF
  - Style: Flat, transparent background, 3px stroke width
  - Show a pie chart with 3 segments (40% used, 30% remaining, 30% buffer)
  - Add to package.json: `"icon": "icon.png"`

  **Icon Requirements**:
  - Format: PNG (not SVG)
  - Size: 128x128 pixels (exact)
  - Background: Transparent (supports both light and dark themes)
  - Style: Flat, no gradients, no shadows

  **Color Palette** (use VS Code blue theme for consistency):
  - Primary color: `#007ACC` (VS Code blue)
  - Accent color: `#4FC1FF` (lighter blue for highlights)
  - Stroke width: 3px for main elements, 2px for details

  **Iconography**:
  - Must show a pie chart with 3 segments (representing usage/limit/balance)
  - Segments should be roughly: 40% used, 30% remaining, 30% buffer
  - Use simple geometric shapes (circles, arcs)
  - No text or numbers in icon
  - No complex gradients or effects

  **Technical Constraints**:
  - Location: Project root (next to package.json)
  - File naming: Exactly `icon.png`
  - Optimize for readability at 32x32 and 64x64 scales

  **Reference Material**:
  - VS Code Icon Design Guidelines: https://code.visualstudio.com/api/references/extension-icons
  - Style reference: Similar to VS Code's built-in "dashboard" icon (simple, flat, geometric)
  - Example marketplace icons: Search "monitor" or "dashboard" on marketplace.visualstudio.com for style reference

  **Acceptance Criteria** (Objective & Verifiable):
  - [x] icon.png created (exactly 128x128 pixels)
  - [x] File format is PNG (verified with file command or properties)
  - [x] Background is transparent (no solid background color)
  - [x] Primary color is #007ACC (verified with color picker)
  - [x] Contains pie chart with exactly 3 segments
  - [x] Stroke width is 3px (measured with design tool)
  - [x] Style is flat (no gradients, no shadows)
  - [x] Added to package.json: `"icon": "icon.png"`
  - [x] Icon renders clearly at 32x32 scale (test by viewing in file explorer)

- [x] 4. Bump Version to 0.0.3

  **What to do**:
  - Update package.json version from 0.0.2 to 0.0.3

  **Acceptance Criteria**:
  - [x] package.json version: `"version": "0.0.3"`

- [x] 5. Compile and Test

  **What to do**:
  - Run `npm run compile` to verify compilation
  - Run `npm test` to verify all tests pass

  **Test Infrastructure Verification** (per VS Code Testing Guide):
  - The project uses `@vscode/test-electron` (official library)
  - Test runner at `src/test/runTest.ts` follows recommended pattern from VS Code docs
  - Tests run in Extension Development Host (as documented in official guide)
  - Mocha test framework (recommended by VS Code documentation)
  - No additional setup needed - infrastructure is already aligned with best practices

  **Acceptance Criteria**:
  - [x] Compilation succeeds (no errors)
  - [x] 114/114 tests pass
  - [x] Test runner uses `@vscode/test-electron` API (verified in src/test/runTest.ts)
  - [x] Test configuration follows VS Code official testing guide pattern

- [x] 6. Package Extension

  **What to do**:
  - Run `vsce package` to generate `.vsix` file
  - Verify no validation errors

  **Acceptance Criteria**:
  - [x] `.vsix` file generated
  - [x] No validation errors from vsce

- [ ] 7. Manual Activation Test

  **What to do**:
  - Press `F5` to launch extension
  - Verify UI elements load correctly
  - Verify no error popups

  **Acceptance Criteria**:
  - [ ] Extension activates without errors
  - [ ] Status bar shows quota info
  - [ ] Tree view appears in sidebar
  - [ ] Commands work in Command Palette

- [ ] 8. Publish to Marketplace

  **What to do**:
  - Verify publisher "vinaosb" has valid PAT with "Marketplace (Manage)" scope
  - Run `vsce publish patch` (auto-increments to 0.0.3)
  - OR manually bump and run `vsce publish`
  - Verify marketplace listing appears

  **Pre-Publish Checks**:
  - [ ] Publisher PAT has correct scope
  - [ ] `.vsix` tested locally (Install from VSIX)
  - [ ] Extension passes all tests

  **Acceptance Criteria**:
  - [ ] Extension published successfully
  - [ ] Marketplace listing shows v0.0.3
  - [ ] Description and changelog visible

---

## Commit Strategy

| After Task | Message | Files |
|------------|---------|--------|
| 1-5 | `fix: add activation error handling and prepare v0.0.3` | extension.ts, CHANGELOG.md, icon.png, package.json |
| 6 | `build: package extension v0.0.3` | .vsix |

---

## Success Criteria

### Final Checklist
- [x] Test error removed
- [x] CHANGELOG.md created
- [x] Icon created and configured
- [x] Version bumped to 0.0.3
- [x] All 114 tests pass
- [ ] Extension activates normally
- [ ] Extension published to marketplace

---

## Notes

### Metis Recommendations

**Version Bump**: Patch (0.0.3) is correct for bug fix

**CHANGELOG**: Required for marketplace - not optional

**Icon**: Highly recommended for professional appearance

**Test Coverage**: 114 tests are sufficient - no activation test needed (manual F5 is better)

**Publisher Verification**: Check PAT scope before publishing

**Pre-Publish Test**: Always test `.vsix` locally (Install from VSIX)

---

## Risks & Mitigations

| Risk | Mitigation |
|--------|-------------|
| Missing CHANGELOG | Create CHANGELOG.md before publishing |
| No icon | Create simple 128x128 PNG before publish |
| Publisher verification | Check marketplace.visualstudio.com/manage |
| First-time publishing | Test vsce package first |

---

## Additional Resources

- [VSCE Documentation](https://github.com/microsoft/vscode-vsce)
- [Marketplace Publisher Management](https://marketplace.visualstudio.com/manage)
- [Icon Design Tips](https://code.visualstudio.com/api/references/extension-icons)
- [VS Code Extension Testing Guide](https://code.visualstudio.com/api/working-with-extensions/testing-extension) - Official testing best practices
