# Decisions - cleanup-and-publish Plan

## [2026-01-28] Architecture & Approach Decisions

### Task Combination Decision (Tasks 3+4)

**Decision**: Combined icon creation and version bump into single delegation

**Rationale**:
- Both tasks modify `package.json` (icon field and version field)
- Prevents potential merge conflicts if done separately
- Single atomic change ensures consistency
- Both tasks are closely related (marketplace preparation)

**Outcome**: Success - both changes applied together in one package.json modification

---

### Icon Creation Approach

**Decision**: Used programmatic canvas/SVG generation for icon.png

**Rationale**:
- Ensures exact adherence to specifications (colors, dimensions, stroke width)
- Reproducible results across different environments
- Avoids manual design tools which could introduce variability
- All specifications are objective (hex codes, pixel dimensions, stroke width)

**Specifications Implemented**:
- Format: PNG (128x128 pixels)
- Colors: #007ACC (primary), #4FC1FF (accent)
- Style: Flat, transparent background, 3px stroke
- Iconography: Pie chart with 3 segments (40%/30%/30%)

**Outcome**: Icon created meeting all 8 acceptance criteria

---

### Testing Strategy Decision

**Decision**: Follow VS Code official testing guide infrastructure

**Rationale**:
- Plan explicitly references VS Code Testing Guide: https://code.visualstudio.com/api/working-with-extensions/testing-extension
- Project already uses `@vscode/test-electron` (official library)
- Test runner at `src/test/runTest.ts` follows recommended pattern
- Mocha framework recommended by VS Code documentation
- No need to reinvent testing infrastructure

**Infrastructure Verified**:
- Uses `@vscode/test-electron` for integration tests
- Tests run in Extension Development Host
- 114 tests passing (sufficient coverage)
- Test configuration aligns with VS Code best practices

**Outcome**: All 114 tests passing, 0 compilation errors

---

### Task Execution Wave Strategy

**Decision**: Organized into 3 waves based on dependencies and automation

**Wave 1** (Tasks 1-4): Cleanup & Preparation
- All independent, can run in parallel
- Core code changes and asset creation
- Automated verification possible

**Wave 2** (Tasks 5-6): Testing & Packaging
- Depends on Wave 1 completion
- Automated verification (compile, test, package)
- No manual intervention needed

**Wave 3** (Tasks 7-8): Manual Verification & Publishing
- Requires interactive VS Code environment (F5)
- Requires visual verification of UI elements
- Requires marketplace authentication (PAT)
- Cannot be automated

**Rationale**:
- Sequential waves prevent dependency issues
- Batch parallel tasks for efficiency
- Separate manual tasks clearly to avoid confusion
- Each wave has clear completion criteria

**Outcome**: Waves 1-2 completed (6/8 tasks), Wave 3 awaiting user action

---

### Manual Task Documentation Decision

**Decision**: Document blockers in separate notepad file

**Rationale**:
- Cannot automate manual tasks, but can document requirements clearly
- Provides step-by-step instructions for user
- Includes troubleshooting and workarounds
- Separates technical execution (automated) from verification (manual)
- Maintains clarity about what requires human intervention

**Documentation Structure**:
- `issues.md`: Detailed blockers, required actions, troubleshooting
- Inline status: Task IDs updated with "BLOCKED" status
- Clear next steps for each manual task

**Outcome**: Users have clear guidance for completing manual tasks
