# Issues & Blockers - cleanup-and-publish Plan

## [2026-01-28] Blocked Tasks - Requires Manual Action

### Task 7: Manual Activation Test - BLOCKED

**Blocker Type**: Requires interactive VS Code environment and visual verification

**Issue**:
- Automated agents cannot press F5 to launch Extension Development Host
- Visual verification of UI elements (status bar, tree view, command palette) requires human eyes
- Cannot automate the extension loading and activation test

**User Action Required**:

```bash
# Steps to complete Task 7:
1. Open this project in VS Code
2. Press F5 to launch Extension Development Host
3. Verify 4 checkpoints:
   - [ ] Extension activates without errors (check Output > Extensions Host)
   - [ ] Status bar shows quota information (bottom right corner)
   - [ ] Commands available in Command Palette (Ctrl+Shift+P, search "Quota Monitor")
   - [ ] Tree view visible in sidebar (left panel)
```

**After completing**:
- Report results with status of all 4 checkpoints
- If any checkpoint fails, provide error details

**Pre-Flight Verification (Automated Checks)**:
✅ Status bar registration: Found in `src/ui/StatusBar.ts` (line 8)
✅ Tree view provider: Registered in `src/extension.ts` (line 46)
✅ Commands: 6 commands registered in `src/extension.ts`:
   - `opencodeQuota.refresh` (line 77)
   - `opencodeQuota.addAccount` (line 85)
   - `opencodeQuota.removeAccount` (line 116)
   - `opencodeQuota.editAccount` (line 136)
   - `opencodeQuota.importFromOpenCode` (line 196)
   - `opencodeQuota.openDetails` (line 239)

**Conclusion**: All UI components are properly registered and ready for manual verification.

---

### Task 8: Publish to Marketplace - BLOCKED

**Blocker Type**: Requires manual PAT configuration and marketplace authentication

**Issue**:
- Publisher "vinaosb" requires a valid Personal Access Token (PAT)
- PAT must have "Marketplace (Manage)" scope
- Token configuration is typically in `~/.vsce` or environment variable
- Publishing command requires interactive authentication

**Prerequisites**:

1. **Verify Publisher**:
   - Visit: https://marketplace.visualstudio.com/publishers/vinaosb
   - Ensure publisher account exists and is accessible

2. **Generate/Configure PAT**:
   ```bash
   # Option 1: Use environment variable (recommended for CI)
   export VSCODE_TOKEN="your-pat-here"
   
   # Option 2: Store in ~/.vsce file
   # Create or edit ~/.vsce file:
   # {"publisher": {"vinaosb": "your-pat-here"}}
   ```

3. **Verify PAT Scope**:
   - Must have "Marketplace (Manage)" scope
   - Token must be valid (not expired)

**User Action Required**:

```bash
# After configuring PAT, run:
npx vsce publish patch

# Or if vsce is installed globally:
vsce publish patch
```

**After completing**:
- Verify at: https://marketplace.visualstudio.com/publishers/vinaosb
- Confirm v0.0.3 appears in extension list
- Verify changelog and description are visible
- Verify icon displays correctly

**Troubleshooting**:
- If PAT issues: Generate new token at https://dev.azure.com/_usersSettings/tokens
- If publisher issues: Check https://marketplace.visualstudio.com/manage
- If validation errors: Review output from `vsce package` for warnings

---

## Workaround Options

If manual tasks cannot be completed, consider:
1. Local testing: Install .vsix file manually to verify extension works
2. Delayed publishing: Complete manual verification at later time
3. Alternative distribution: Share .vsix file directly for testing before publishing
