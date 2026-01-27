# Repository Cleanup Plan

## Objective
Clean up repository by removing temporary, generated, and redundant files while preserving essential code, documentation, and planning artifacts.

---

## Files to DELETE (Safe to Remove)

### Temporary / Log Files
- **debug.log** - Debugging output (temporary)
- **test_output.txt** - Captured test results (temporary)
- **tsc_output.txt** - Captured compiler output (temporary)

### Redundant Documentation
- **COMPLETION_REPORT.md** - Leftover from task completion
- **MANUAL_VERIFICATION_STEPS.md** - Leftover manual testing documentation
- **PROJECT-COMPLETE.md** - Leftover project completion indicator

### Build Artifacts
- **opencode-quota-monitor-0.0.1.vsix** - Stale packaged extension (regenerated on demand)
- **.vsix** - Any VSIX files (generated on build)

### Empty Directories
- **test/** - Empty directory (not used, tests are in src/test/)

### Accidental Files
- **nul** - Accidentally created empty file artifact

---

## Files to KEEP (Essential)

### Source Code
- **src/** - All TypeScript source code and tests
- **package.json** - Project configuration
- **package-lock.json** - Dependency lock file
- **tsconfig.json** - TypeScript configuration
- **.eslintrc.json** - ESLint configuration

### Configuration Files
- **.gitignore** - Git exclusion rules
- **.vscodeignore** - VS Code packaging exclusion rules
- **AGENTS.md** - Repository instructions and agent roles

### Documentation
- **README.md** - Main project documentation

### Planning Files (Decision Required)
- **.sisyphus/** - Internal task planning and notepad directory
  - *Option 1*: KEEP (preserves hardening work history, learnings)
  - *Option 2*: DELETE (clean slate, start fresh for next project)

---

## .gitignore Updates

### Add These Patterns to Prevent Future Clutter

```gitignore
# Logs
*.log

# Test outputs
test_output.txt
tsc_output.txt

# Build artifacts
*.vsix

# Accidental files
nul

# IDE temp files (already in .vscode*, but explicit is safer)
*.swp
*.swo
*~

# OS files (if not already present)
.DS_Store
Thumbs.db

# Coverage reports (if added later)
coverage/
.nyc_output/
```

---

## Cleanup Execution Steps

### Step 1: Delete Temporary Files
```bash
rm debug.log
rm test_output.txt
rm tsc_output.txt
rm nul
```

### Step 2: Delete Redundant Documentation
```bash
rm COMPLETION_REPORT.md
rm MANUAL_VERIFICATION_STEPS.md
rm PROJECT-COMPLETE.md
```

### Step 3: Delete Build Artifacts
```bash
rm *.vsix
rm -f opencode-quota-monitor-*.vsix
```

### Step 4: Remove Empty Directory
```bash
rmdir test/
```

### Step 5: Update .gitignore
- Append the patterns listed above to .gitignore
- Commit the changes

### Step 6: Optional - Remove .sisyphus Directory
```bash
# ONLY if you want to clean slate
rm -rf .sisyphus/
```

---

## Decision Point: .sisyphus Directory

### Option 1: KEEP (Recommended)
**Rationale:**
- Preserves hardening work history (117 tasks, learnings, decisions)
- Valuable reference for future projects
- No negative impact on repository size (~100KB)
- Contains insights on resilience patterns, security practices

**When to Keep:**
- You may reference this work in future projects
- You want to review what was done during hardening
- You're building similar extensions (reusable patterns)

### Option 2: DELETE (Clean Slate)
**Rationale:**
- Cleaner repository
- No confusion from past planning artifacts
- Fresh start for next project

**When to Delete:**
- Hardening work is completely finished
- No plans to reference this work
- You want minimal repository footprint

**My Recommendation:** KEEP .sisyphus/
- It's small but contains valuable learnings
- Can be archived or deleted later if needed
- No harm in preserving it

---

## Post-Cleanup Verification

### Commands to Run
```bash
# Check for remaining temporary files
git status

# Verify .gitignore was updated
cat .gitignore

# Confirm no essential files were deleted
ls -la src/
ls -la package.json README.md AGENTS.md
```

### Expected Results
- **Repository size**: Reduced by ~50-100KB
- **Git status**: Only .gitignore change (if .sisyphus/ kept)
- **Functionality**: Unchanged (all source code intact)
- **Tests**: All 114 tests still passing

---

## Risk Assessment

| Action | Risk | Impact | Mitigation |
|---------|--------|----------|
| Delete temp files | NONE | No impact on code or functionality |
| Delete build artifacts | LOW | Can be regenerated with `npx vsce package` |
| Delete redundant docs | LOW | Essential docs (README.md) remain |
| Update .gitignore | NONE | Prevents future clutter |
| Delete .sisyphus/ | LOW (if decided) | Learnings lost but code unaffected |

---

## Summary

**Recommended Actions:**
1. ✅ Delete all temporary and redundant files
2. ✅ Update .gitignore with new patterns
3. ✅ Commit cleanup changes
4. ✅ Consider keeping .sisyphus/ for reference
5. ✅ Verify tests still pass (114/114)

**Final State:**
- Clean, production-ready repository
- No accidental or temporary files
- Proper gitignore rules
- All essential code and documentation intact
- Ready for long-term maintenance and marketplace submission
