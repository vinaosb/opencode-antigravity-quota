# GitHub Actions Auto-Publish for VS Code Extension

## TL;DR

> **Quick Summary**: Automate VS Code extension publishing to marketplace on every push to main branch using semantic-release with Conventional Commits enforcement
>
> **Deliverables**:
> - GitHub Actions workflow for CI/CD (release.yml)
> - semantic-release configuration (.releaserc)
> - Conventional Commits enforcement (commitlint + Husky)
> - Automated version bumping and CHANGELOG.md generation
> - Automated marketplace publishing via semantic-release-vsce plugin
>
> **Estimated Effort**: Short (~1-2 hours implementation + testing)
> **Parallel Execution**: NO - sequential implementation
> **Critical Path**: Add dependencies → Configure commitlint → Configure semantic-release → Create workflow → Test dry-run → Deploy → Add secret

---

## Context

### Original Request
Create GitHub Actions automation to auto-publish VS Code extension when pushing commits to branch

### Interview Summary
**Key Discussions**:
- Trigger branch: main
- Versioning: Automated (semantic-release)
- Pre-publish checks: Full test suite (npm test)
- Branch protection: None (semantic-release can push freely)

**Research Findings**:
- semantic-release is recommended for fully automated releases
- semantic-release-vsce plugin enables VS Code marketplace publishing
- Conventional Commits required for semantic versioning (fix→patch, feat→minor, BREAKING CHANGE→major)
- commitlint + Husky enforce commit message format locally
- VSCE_PAT secret required for marketplace publishing
- No branch protection → semantic-release can push package.json and CHANGELOG.md back to repo

### Metis Review
**Identified Gaps** (addressed):
- Release committer identity: Will use semantic-release default (GitHub Actions bot)
- Commit back strategy: Enabled (@semantic-release/git plugin)
- Signed commits/tags: Not required (assumption for small project)
- Test matrix: Single node version (fast and sufficient for now)
- Notification strategy: GitHub Actions email notification default
- Token rotation: Documented in acceptance criteria

---

## Work Objectives

### Core Objective
Automate VS Code extension publishing workflow: on push to main → run tests → bump version → publish to marketplace

### Concrete Deliverables
- `.github/workflows/release.yml` - CI/CD workflow
- `.releaserc` - semantic-release configuration
- `.commitlintrc` - Commit message linting rules
- `.husky/pre-commit` - Git hook for commit validation
- Updated `package.json` - New devDependencies and scripts
- Updated `package-lock.json` - Lock file for new dependencies
- GitHub Secret `VSCE_PAT` - Marketplace authentication token
- Documentation for token setup and rotation

### Definition of Done
- [ ] Workflow runs on every push to main
- [ ] Full test suite passes before release step
- [ ] Semantic versioning follows Conventional Commits rules
- [ ] CHANGELOG.md updated automatically
- [ ] Extension published to VS Code marketplace
- [ ] GitHub release created with version tag
- [ ] Dry-run verified before enabling auto-publish
- [ ] Documentation complete for token management

### Must Have
- Full test suite must pass before publishing
- Only publish on push to main branch
- Enforce Conventional Commits format
- Automate version bumping and CHANGELOG.md generation
- Publish to VS Code marketplace (vinaosb publisher)

### Must NOT Have (Guardrails)
- No manual version bumping required
- No separate release commands needed
- No pushing to non-main branches
- No publishing without test passing
- No leaking secrets in logs or changelog
- Scope excluded: Multi-channel publishing (beta/alpha channels)
- Scope excluded: Package.json signing/certificates
- Scope excluded: Multi-repo or mono-repo support

---

## Verification Strategy (MANDATORY)

> Test infrastructure EXISTS (npm test available in package.json)
> User wants: Automated verification (tests must pass before publish)
> Framework: bun test (based on AGENTS.md, but using npm test which runs compiled output)

### Test Decision
- **Infrastructure exists**: YES (npm test in package.json)
- **User wants tests**: YES (TDD - run full test suite before publishing)
- **Framework**: npm test (compiles then runs extension tests)
- **CI Strategy**: Fail-fast - workflow stops immediately if tests fail

### Verification Approach

**CI Pipeline Verification** (each TODO step includes verification):

| Step | Verification | Expected Result |
|------|---------------|-----------------|
| 1. Add dependencies | `npm install` completes without errors | Dependencies installed |
| 2. Configure commitlint | Commit with invalid message fails hook | Error message shown |
| 3. Configure semantic-release | `npx semantic-release --dry-run` | Shows release analysis, no publish |
| 4. Create workflow | Workflow appears in GitHub Actions tab | Workflow file visible |
| 5. Test dry-run | Dry-run completes successfully | No actual publish, shows version |
| 6. Enable auto-publish | Push to main triggers full pipeline | Tests run → Release created |

**Final Smoke Test** (after all tasks complete):

1. **Create test commit** with conventional message:
   ```bash
   git checkout -b test-release
   git commit --allow-empty -m "chore: test automated release"
   git push origin test-release
   git checkout main
   git merge test-release
   git push origin main
   ```

2. **Verify GitHub Actions**:
   - Navigate to Actions tab
   - Confirm workflow runs
   - Confirm tests pass
   - Confirm semantic-release runs

3. **Verify Marketplace**:
   - Visit https://marketplace.visualstudio.com/publishers/vinaosb
   - Confirm new version appears
   - Confirm extension can be installed

**Evidence Required**:
- [ ] GitHub Actions workflow run logs captured
- [ ] GitHub Release page shows new version (vX.Y.Z)
- [ ] Marketplace shows new extension version
- [ ] package.json version updated in repository

---

## Execution Strategy

### Sequential Execution (No Parallelization)

> This workflow requires sequential implementation because each step depends on previous configuration:
> 1. Dependencies must be installed before configuring tools
> 2. Commitlint must work before semantic-release can analyze commits
> 3. Semantic-release config must exist before workflow can use it
> 4. Workflow must be tested in dry-run before enabling auto-publish
> 5. Secret must be added before marketplace publishing works

```
Step 1: Install Dependencies
  ↓
Step 2: Configure Commitlint + Husky
  ↓
Step 3: Configure Semantic Release
  ↓
Step 4: Create GitHub Actions Workflow
  ↓
Step 5: Test Dry-Run (verify no publish)
  ↓
Step 6: Deploy & Enable Auto-Publish
  ↓
Step 7: Add VSCE_PAT Secret
  ↓
Step 8: Final Integration Test
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3 | None |
| 2 | 1 | 3 | None |
| 3 | 1, 2 | 4 | None |
| 4 | 3 | 5 | None |
| 5 | 4 | 6 | None |
| 6 | 5 | 7 | None |
| 7 | 6 | 8 | None |
| 8 | 7 | None | None |

**Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info.

- [x] 1. Install semantic-release, plugins, and commitlint dependencies

  **What to do**:
  - Install devDependencies via npm:
    ```bash
    npm install --save-dev semantic-release @semantic-release/changelog @semantic-release/commit-analyzer @semantic-release/git @semantic-release/github @semantic-release/release-notes-generator semantic-release-vsce
    npm install --save-dev @commitlint/cli @commitlint/config-conventional husky
    ```
  - Verify package-lock.json is updated
  - Run `npm install` to confirm all dependencies resolve

  **Must NOT do**:
  - Install unnecessary plugins (keep stack minimal)
  - Install production dependencies for these tools (they're devDependencies only)

  **Recommended Agent Profile**:
  > Select category + skills based on task domain. Justify each choice.
  - **Category**: `quick`
    - Reason: Simple package installation task, no complex logic
  - **Skills**: `[]`
    - No special skills needed for npm install
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed - no git operations required
    - `frontend-ui-ux`: Not needed - no UI work

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential | Step 1 (must start first)
  - **Blocks**: Tasks 2, 3 (require these dependencies)
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  > The executor has NO context from your interview. References are their ONLY guide.
  > Each reference must answer: "What should I look at and WHY?"

  **Pattern References** (existing code to follow):
  - `package.json:1-50` - Current dependencies structure and devDependencies section

  **API/Type References** (contracts to implement against):
  - semantic-release npm package documentation (https://github.com/semantic-release/semantic-release) - Plugin configuration structure
  - @semantic-release/changelog (https://github.com/semantic-release/changelog) - CHANGELOG.md output options
  - semantic-release-vsce (https://github.com/felipecrs/semantic-release-vsce) - VS Code marketplace publishing config

  **Test References** (testing patterns to follow):
  - `package.json:"scripts"` - Test command structure (npm test) to run before publishing

  **Documentation References** (specs and requirements):
  - `.sisyphus/drafts/github-actions-auto-publish.md` - Interview notes and decisions
  - AGENTS.md - Project conventions (npm test, lint, TypeScript)

  **External References** (libraries and frameworks):
  - semantic-release documentation: https://semantic-release.gitbook.io/semantic-release/ - Plugin configuration and options
  - Conventional Commits: https://www.conventionalcommits.org/ - Commit message format specification
  - commitlint: https://commitlint.js.org/ - Configuration options
  - Husky: https://typicode.github.io/husky/ - Git hook setup

  **WHY Each Reference Matters** (explain the relevance):
  - package.json: Shows current dependency management pattern to follow
  - semantic-release docs: Required to understand plugin configuration order and options
  - Conventional Commits: Defines the commit format that semantic-release expects
  - commitlint + Husky: Needed for local enforcement of commit format

  **Acceptance Criteria**:

  > CRITICAL: Acceptance = EXECUTION, not just "it should work".
  > The executor MUST run these commands and verify output.

  **Automated Execution Verification**:

  - [ ] DevDependencies installed successfully:
    - Command: `grep -A 10 '"devDependencies"' package.json`
    - Output contains: `semantic-release`, `@semantic-release/changelog`, `@semantic-release/commit-analyzer`, `@semantic-release/git`, `@semantic-release/github`, `@semantic-release/release-notes-generator`, `semantic-release-vsce`, `@commitlint/cli`, `@commitlint/config-conventional`, `husky`
  - [ ] package-lock.json updated:
    - Command: `npm ls semantic-release`
    - Output shows: semantic-release@X.Y.Z
  - [ ] No installation errors:
    - Command: `npm list --depth=0`
    - Exit code: 0 (success)
    - No ERR! or WARN! messages related to installed packages

  **Commit**: YES (groups with Task 2)
  - Message: `ci: add semantic-release, plugins, and commitlint dependencies`
  - Files: package.json, package-lock.json
  - Pre-commit: None

- [x] 2. Configure commitlint for Conventional Commits enforcement

  **What to do**:
  - Create `.commitlintrc` file:
    ```json
    {
      "extends": ["@commitlint/config-conventional"]
    }
    ```
  - Initialize Husky and create pre-commit hook:
    ```bash
    npx husky install
    npx husky add .husky/commit-msg 'npx --no -- commitlint --edit $1'
    ```
  - Verify hook is executable: `chmod +x .husky/commit-msg` (Linux/Mac) or `git update-index --chmod=+x .husky/commit-msg` (Windows Git Bash)
  - Test hook with invalid commit message:
    ```bash
    git commit --allow-empty -m "invalid commit message"
    ```
  - Should fail with commitlint error
  - Test hook with valid commit message:
    ```bash
    git commit --allow-empty -m "chore: test commitlint hook"
    ```
  - Should succeed

  **Must NOT do**:
  - Configure strict commit scopes (unless user requested)
  - Customize commit types beyond conventional preset
  - Remove existing commit-msg hooks if they exist

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Configuration file creation and Husky initialization
  - **Skills**: `[]`
    - No special skills needed
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed - basic git hooks are standard

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential | Step 2
  - **Blocks**: Task 3 (semantic-release expects valid commits)
  - **Blocked By**: Task 1 (requires commitlint + husky installed)

  **References**:
  **Pattern References**:
  - None (new functionality)

  **API/Type References**:
  - commitlint configuration: https://commitlint.js.org/#/reference-configuration - Config file structure
  - Husky hooks: https://typicode.github.io/husky/#usage - Hook creation commands

  **Test References**:
  - `package.json:"scripts"` - Test commands to verify hooks work

  **Documentation References**:
  - `.commitlintrc` (to be created) - Commit message rules
  - `.husky/commit-msg` (to be created) - Git hook script

  **External References**:
  - commitlint docs: https://commitlint.js.org/ - Full configuration reference
  - Husky docs: https://typicode.github.io/husky/ - Git hook management

  **Acceptance Criteria**:

  - [ ] .commitlintrc created:
    - Command: `cat .commitlintrc`
    - Output contains: `{"extends": ["@commitlint/config-conventional"]}`
  - [ ] Husky initialized:
    - Command: `cat package.json | grep -i husky`
    - Output contains: husky prepare script
  - [ ] commit-msg hook exists:
    - Command: `cat .husky/commit-msg`
    - Output contains: `commitlint --edit $1`
  - [ ] Invalid commit fails:
    - Command: `git commit --allow-empty -m "invalid" 2>&1 | head -5`
    - Output contains: `⧗   input: invalid` or similar commitlint error
  - [ ] Valid commit succeeds:
    - Command: `git commit --allow-empty -m "chore: verify commitlint works"`
    - Exit code: 0 (success)
    - No commitlint errors

  **Commit**: YES (groups with Task 1)
  - Message: `chore: configure commitlint and Husky for Conventional Commits enforcement`
  - Files: .commitlintrc, .husky/commit-msg, package.json (prepare script)
  - Pre-commit: `npm test` (verify test suite still passes)

- [x] 3. Configure semantic-release with plugins

  **What to do**:
  - Create `.releaserc` configuration file:
    ```json
    {
      "branches": ["main"],
      "plugins": [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        "@semantic-release/changelog",
        "@semantic-release/npm",
        "@semantic-release/github",
        "@semantic-release/git",
        "semantic-release-vsce"
      ]
    }
    ```
  - Note: Plugin order is critical (commit-analyzer must run first, git must run last)
  - Verify configuration is valid JSON:
    ```bash
    cat .releaserc | jq .
    ```

  **Must NOT do**:
  - Configure multiple branches (only main for now)
  - Enable dry-run in production config (should be CLI flag only)
  - Remove @semantic-release/npm (required for package.json version update)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: JSON configuration file creation
  - **Skills**: `[]`
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential | Step 3
  - **Blocks**: Task 4 (workflow uses this config)
  - **Blocked By**: Tasks 1, 2 (requires commitlint working for semantic-release to analyze commits)

  **References**:
  **Pattern References**:
  - None (new functionality)

  **API/Type References**:
  - semantic-release plugin docs: https://semantic-release.gitbook.io/semantic-release/usage/plugins - Plugin configuration and order

  **Test References**:
  - None (semantic-release config doesn't require tests)

  **Documentation References**:
  - `.releaserc` (to be created) - semantic-release configuration

  **External References**:
  - semantic-release plugin order: https://semantic-release.gitbook.io/semantic-release/usage/plugins#plugin-execution-order - Critical execution order
  - semantic-release-vsce: https://github.com/felipecrs/semantic-release-vsce - VS Code marketplace publishing

  **Acceptance Criteria**:

  - [ ] .releaserc created:
    - Command: `cat .releaserc`
    - Output contains: All 7 plugins listed
  - [ ] Valid JSON:
    - Command: `cat .releaserc | jq . 2>&1 | head -5`
    - Exit code: 0 (valid JSON)
    - No JSON parse errors
  - [ ] Plugin order correct:
    - Command: `cat .releaserc | jq '.plugins[]'`
    - Output order: commit-analyzer, release-notes-generator, changelog, npm, github, git, semantic-release-vsce

  **Commit**: YES
  - Message: `ci: add semantic-release configuration`
  - Files: .releaserc
  - Pre-commit: `npm test`

- [x] 4. Create GitHub Actions workflow for CI/CD

  **What to do**:
  - Create `.github/workflows/release.yml`:
    ```yaml
    name: Release

    on:
      push:
        branches:
          - main

    jobs:
      release:
        name: Release
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v4
            with:
              fetch-depth: 0

          - name: Setup Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '20'

          - name: Install dependencies
            run: npm ci

          - name: Run tests
            run: npm test

          - name: Release
            env:
              GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
              VSCE_PAT: ${{ secrets.VSCE_PAT }}
            run: npx semantic-release
    ```
  - Verify workflow syntax:
    ```bash
    cat .github/workflows/release.yml | yamllint 2>&1 || echo "yamllint not installed, skipping syntax check"
    ```
  - Confirm file exists and has correct structure

  **Must NOT do**:
  - Configure additional triggers (only main branch)
  - Add jobs beyond release (keep simple)
  - Use outdated actions (use @v4 for checkout, @v4 for setup-node)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: YAML workflow file creation
  - **Skills**: `["git-master"]`
    - `git-master`: Needed to understand GitHub Actions syntax and patterns
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed - no UI work

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential | Step 4
  - **Blocks**: Task 5 (testing workflow)
  - **Blocked By**: Task 3 (requires .releaserc to exist)

  **References**:
  **Pattern References**:
  - None (new functionality)

  **API/Type References**:
  - GitHub Actions docs: https://docs.github.com/en/actions - Workflow syntax and configuration
  - actions/checkout: https://github.com/actions/checkout - Checkout action parameters (fetch-depth: 0)
  - actions/setup-node: https://github.com/actions/setup-node - Node.js setup

  **Test References**:
  - `package.json:"scripts"` - Test command to run before release

  **Documentation References**:
  - `.github/workflows/release.yml` (to be created) - CI/CD workflow

  **External References**:
  - GitHub Actions workflow syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
  - semantic-release in CI: https://semantic-release.gitbook.io/semantic-release/usage/ci-configuration

  **Acceptance Criteria**:

  - [ ] Workflow file created:
    - Command: `cat .github/workflows/release.yml`
    - Output contains: name: Release, on: push: branches: main
  - [ ] Fetch depth configured:
    - Command: `grep -A 3 "Checkout" .github/workflows/release.yml`
    - Output contains: fetch-depth: 0 (required for semantic-release)
  - [ ] Tests configured:
    - Command: `grep "npm test" .github/workflows/release.yml`
    - Output contains: step that runs npm test
  - [ ] Secrets configured:
    - Command: `grep "GITHUB_TOKEN\|VSCE_PAT" .github/workflows/release.yml`
    - Output contains: Both GITHUB_TOKEN and VSCE_PAT env variables
  - [ ] Valid YAML (if yamllint available):
    - Command: `yamllint .github/workflows/release.yml 2>&1 || echo "skipped"`
    - Exit code: 0 (if yamllint installed)

  **Commit**: YES
  - Message: `ci: add GitHub Actions workflow for automated release`
  - Files: .github/workflows/release.yml
  - Pre-commit: `npm test`

- [x] 5. Test dry-run to verify configuration (no actual publish)

  **What to do**:
  - Create a test branch for dry-run verification:
    ```bash
    git checkout -b test/dry-run
    ```
  - Add a conventional commit to trigger semantic-release:
    ```bash
    git commit --allow-empty -m "feat: test dry-run mode"
    ```
  - Run semantic-release in dry-run mode locally:
    ```bash
    export DRY_RUN=true
    npx semantic-release --dry-run
    ```
  - Verify output shows:
    - Commit analysis (no breaking changes, new features, etc.)
    - Computed version bump (should be v0.0.4 or similar based on history)
    - Generated release notes
    - No actual publish to marketplace (dry-run flag prevents this)
  - Verify no changes to package.json or CHANGELOG.md (dry-run should not commit)
  - Clean up test branch:
    ```bash
    git checkout main
    git branch -D test/dry-run
    ```

  **Must NOT do**:
  - Publish to marketplace in dry-run
  - Modify package.json or CHANGELOG.md during dry-run
  - Push test branch to remote (keep local)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Testing command execution, verifying output
  - **Skills**: `["git-master"]`
    - `git-master`: Needed for git branch management and cleanup
  - **Skills Evaluated but Omitted**:
    - Other skills not needed for local testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential | Step 5
  - **Blocks**: Task 6 (enabling auto-publish requires successful dry-run)
  - **Blocked By**: Task 4 (workflow must exist before testing)

  **References**:
  **Pattern References**:
  - `package.json` - Version to verify no changes during dry-run

  **API/Type References**:
  - semantic-release CLI: https://semantic-release.gitbook.io/semantic-release/usage/cli-arguments#dry-run - Dry-run flag documentation

  **Test References**:
  - None (dry-run is its own verification)

  **Documentation References**:
  - `.releaserc` - Configuration being tested

  **External References**:
  - semantic-release dry-run: https://semantic-release.gitbook.io/semantic-release/usage/cli-arguments#dry-run - Testing without publishing

  **Acceptance Criteria**:

  - [ ] Dry-run executes without errors:
    - Command: `npx semantic-release --dry-run 2>&1 | tail -20`
    - Output contains: NO RELEASE (or similar "dry-run" indicator) or shows computed version
    - Exit code: 0 (success)
  - [ ] Shows commit analysis:
    - Command: `npx semantic-release --dry-run 2>&1 | grep -i "analyzing\|commits" | head -5`
    - Output contains: Mention of commits being analyzed
  - [ ] No marketplace publish:
    - Command: `npx semantic-release --dry-run 2>&1 | grep -i "vsce\|publish\|marketplace" | head -5`
    - Output DOES NOT contain: Actually publishing to marketplace (should show "would publish" or nothing)
  - [ ] package.json unchanged:
    - Command: `git diff HEAD -- package.json`
    - Output: Empty (no changes)
  - [ ] CHANGELOG.md unchanged:
    - Command: `git diff HEAD -- CHANGELOG.md`
    - Output: Empty (no changes)
  - [ ] Test branch cleaned up:
    - Command: `git branch -l | grep test/dry-run`
    - Output: Empty (test branch deleted)

  **Commit**: NO (this is a local verification task, no git changes)

- [x] 6. Push configuration to GitHub and enable auto-publish

  **What to do**:
  - Commit all changes (Tasks 1-4) with conventional message:
    ```bash
    git add package.json package-lock.json .commitlintrc .husky/commit-msg .releaserc .github/
    git commit -m "ci: configure automated release pipeline with semantic-release"
    ```
  - Push to main:
    ```bash
    git push origin main
    ```
  - Verify GitHub Actions workflow is visible:
    - Navigate to: https://github.com/vinaosb/opencode-antigravity-quota/actions
    - Confirm: "Release" workflow appears
  - Verify workflow is NOT triggered yet (VSCE_PAT secret not set):
    - Check Actions tab for workflow run
    - Should show: No run (or failed with missing secret error)
  - Wait for first workflow run (if triggered, should fail on missing secret)
  - Verify repository files updated on GitHub:
    - Navigate to: https://github.com/vinaosb/opencode-antigravity-quota
    - Confirm: All new files visible (workflow, .releaserc, etc.)

  **Must NOT do**:
  - Push to non-main branches
  - Create pull request (push directly to main for initial deployment)
  - Merge from branches without conventional commits

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Git push operation
  - **Skills**: `["git-master"]`
    - `git-master`: Required for git push and GitHub integration
  - **Skills Evaluated but Omitted**:
    - Other skills not needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential | Step 6
  - **Blocks**: Task 7 (secret setup depends on workflow existing)
  - **Blocked By**: Task 5 (dry-run must succeed before pushing)

  **References**:
  **Pattern References**:
  - Previous commits in repo - Commit message patterns to follow

  **API/Type References**:
  - Git push: https://git-scm.com/docs/git-push - Push command syntax

  **Test References**:
  - None (verification is manual GitHub UI check)

  **Documentation References**:
  - `.github/workflows/release.yml` - Workflow that will run

  **External References**:
  - GitHub Actions docs: https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows - Viewing workflow runs

  **Acceptance Criteria**:

  - [ ] Changes committed:
    - Command: `git log -1 --oneline`
    - Output contains: ci: configure automated release pipeline
  - [ ] Pushed to main:
    - Command: `git status`
    - Output contains: nothing to commit, working tree clean
  - [ ] Workflow visible on GitHub:
    - Manual verification: Navigate to Actions tab
    - Confirm: "Release" workflow listed
  - [ ] Files visible on GitHub:
    - Manual verification: Navigate to repository root
    - Confirm: .github/, .releaserc, .commitlintrc visible

  **Commit**: YES (this IS the commit action)
  - Message: `ci: configure automated release pipeline with semantic-release`
  - Files: All configuration files
  - Pre-commit: `npm test`

- [x] 7. Create and add VSCE_PAT secret to GitHub repository

  **What to do**:
  - Document VSCE_PAT creation instructions for user:
    1. Visit: https://dev.azure.com/_usersSettings/tokens
    2. Click: "Create new token"
    3. Token name: "vinaosb-opencode-quota-monitor-ci"
    4. Organization: Leave blank (or "vinaosb")
    5. Expiration: Set to 1 year or more
    6. Scopes: Check ONLY "Marketplace (Manage)" - CRITICAL
    7. Click: "Create"
    8. Copy token value immediately (disappears after page closes)
  - Create documentation file `.sisyphus/notepads/github-actions-auto-publish/token-setup.md`:
    ```markdown
    # VSCE_PAT Setup for Auto-Publish

    ## Create Personal Access Token

    1. Visit: https://dev.azure.com/_usersSettings/tokens
    2. Click "Create new token"
    3. Configuration:
       - Token name: `vinaosb-opencode-quota-monitor-ci`
       - Organization: (leave blank or select "vinaosb")
       - Expiration: 1 year or more
       - Scopes: Check ONLY "Marketplace (Manage)"
    4. Click "Create"
    5. Copy token immediately (cannot be recovered)

    ## Add to GitHub Secret

    1. Visit: https://github.com/vinaosb/opencode-antigravity-quota/settings/secrets/actions
    2. Click "New repository secret"
    3. Name: `VSCE_PAT`
    4. Secret: Paste the token value
    5. Click "Add secret"

    ## Verification

    After adding secret:
    - Push a new commit to main
    - Verify GitHub Actions workflow runs successfully
    - Verify new version appears on marketplace

    ## Token Rotation

    Rotate token annually or on suspected compromise:
    1. Create new token following steps above
    2. Update GitHub secret with new value
    3. Revoke old token in Azure DevOps
    ```
  - Note: This task requires USER ACTION - token must be created manually due to security
  - After user adds secret, verify workflow can access it:
    - Push a test commit:
      ```bash
      git commit --allow-empty -m "chore: verify VSCE_PAT secret"
      git push origin main
      ```
    - Monitor GitHub Actions: should show no authentication errors

  **Must NOT do**:
  - Store token in code (security violation)
  - Log token in GitHub Actions output
  - Create token with excessive scopes (only Marketplace -> Manage needed)
  - Set expiration to less than 1 year (frequent rotation breaks CI)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Documentation file creation
  - **Skills**: `[]`
    - No special skills needed for documentation
  - **Skills Evaluated but Omitted**:
    - All other skills not applicable

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential | Step 7
  - **Blocks**: Task 8 (final test requires secret)
  - **Blocked By**: Task 6 (workflow must exist before secret can be tested)

  **References**:
  **Pattern References**:
  - None (new documentation)

  **API/Type References**:
  - Azure DevOps tokens: https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens - Token creation

  **Test References**:
  - None (documentation only)

  **Documentation References**:
  - `.sisyphus/notepads/github-actions-auto-publish/token-setup.md` (to be created) - Token setup guide

  **External References**:
  - VS Code marketplace authentication: https://code.visualstudio.com/api/working-with-extensions/publishing-extension - PAT requirements

  **Acceptance Criteria**:

  - [ ] Documentation file created:
    - Command: `cat .sisyphus/notepads/github-actions-auto-publish/token-setup.md`
    - Output contains: Token creation steps, GitHub secret setup, rotation procedure
  - [ ] Documentation is complete:
    - Command: `grep -c "Create New Token\|Add Secret\|Verification" .sisyphus/notepads/github-actions-auto-publish/token-setup.md`
    - Output contains: At least 3 matches (each section present)
  - [ ] User instructed to add secret:
    - Manual: User confirms secret added
  - [ ] Workflow accesses secret successfully:
    - Command: Wait for next workflow run after secret added
    - Verify: No authentication errors in workflow logs
    - Manual: Check GitHub Actions run output

  **Commit**: YES
  - Message: `docs: add VSCE_PAT token setup documentation`
  - Files: .sisyphus/notepads/github-actions-auto-publish/token-setup.md
  - Pre-commit: None (documentation file, no tests needed)

- [x] 8. Final integration test (trigger actual publish)

  **What to do**:
  - Verify VSCE_PAT secret is added by user:
    - Manual: Confirm user has added VSCE_PAT to GitHub secrets
  - Create a conventional commit to trigger full pipeline:
    ```bash
    git commit --allow-empty -m "chore: trigger automated release pipeline"
    git push origin main
    ```
  - Monitor GitHub Actions workflow run:
    - Navigate to: https://github.com/vinaosb/opencode-antigravity-quota/actions
    - Click on latest "Release" workflow run
    - Verify steps:
      1. Checkout: Success
      2. Setup Node.js: Success
      3. Install dependencies: Success
      4. Run tests: Success (all tests pass)
      5. Release: Success (semantic-release runs)
  - Verify marketplace publishing:
    - Navigate to: https://marketplace.visualstudio.com/publishers/vinaosb
    - Confirm: New version appears (should be v0.0.4 or based on commit history)
    - Verify: Extension can be installed: `code --install-extension vinaosb.opencode-quota-monitor`
  - Verify GitHub release created:
    - Navigate to: https://github.com/vinaosb/opencode-antigravity-quota/releases
    - Confirm: New release tag (vX.Y.Z) created
    - Verify: Release notes generated (should contain commit summaries)
  - Verify package.json version updated in repository:
    - Command: `git fetch origin && git show origin/main:package.json | grep '"version"'`
    - Output contains: Updated version (e.g., "0.0.4")
  - Verify CHANGELOG.md updated in repository:
    - Command: `git show origin/main:CHANGELOG.md | head -20`
    - Output contains: New version entry with release date and notes

  **Must NOT do**:
  - Push non-conventional commits (they won't trigger release)
  - Modify files manually in pipeline (semantic-release handles all version updates)
  - Skip test verification (must confirm tests pass before publish)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Final verification task
  - **Skills**: `["git-master"]`
    - `git-master`: Required for git push and verification
  - **Skills Evaluated but Omitted**:
    - Other skills not needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential | Step 8 (final step)
  - **Blocks**: None (completion of all tasks)
  - **Blocked By**: Task 7 (VSCE_PAT secret must exist for marketplace publishing)

  **References**:
  **Pattern References**:
  - Previous release commits - Commit patterns to follow

  **API/Type References**:
  - GitHub Releases API: https://docs.github.com/en/rest/releases/releases - Release creation verification
  - VS Code Marketplace API: https://code.visualstudio.com/api/working-with-extensions/publishing-extension - Publish verification

  **Test References**:
  - `package.json:"scripts"` - Test command to verify in workflow

  **Documentation References**:
  - `.releaserc` - Release configuration being tested
  - `.sisyphus/notepads/github-actions-auto-publish/token-setup.md` - Token setup instructions

  **External References**:
  - GitHub Releases: https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository - Managing releases

  **Acceptance Criteria**:

  - [ ] Commit created and pushed:
    - Command: `git log -1 --oneline`
    - Output contains: chore: trigger automated release pipeline
    - Command: `git status`
    - Output contains: working tree clean
  - [ ] GitHub Actions workflow succeeds:
    - Manual verification: Navigate to Actions tab
    - Confirm: All steps show green checkmark
    - Confirm: No errors in workflow logs
  - [ ] Marketplace publishing successful:
    - Manual verification: Navigate to publisher page
    - Confirm: New version appears under vinaosb publisher
    - Command: `code --list-extensions | grep opencode-quota-monitor`
    - Output contains: vinaosb.opencode-quota-monitor@X.Y.Z (if installed locally)
  - [ ] GitHub release created:
    - Manual verification: Navigate to Releases tab
    - Confirm: New tag (vX.Y.Z) exists
    - Confirm: Release notes generated and visible
  - [ ] package.json version updated:
    - Command: `git show origin/main:package.json | grep '"version"'`
    - Output contains: Version incremented (e.g., "0.0.4")
  - [ ] CHANGELOG.md updated:
    - Command: `git show origin/main:CHANGELOG.md | head -20`
    - Output contains: New version section with date and release notes

  **Commit**: NO (verification task only, no changes to make)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1-2 | `ci: add semantic-release, plugins, and commitlint dependencies; configure Conventional Commits enforcement` | package.json, package-lock.json, .commitlintrc, .husky/commit-msg | npm test |
| 3 | `ci: add semantic-release configuration` | .releaserc | npm test |
| 4 | `ci: add GitHub Actions workflow for automated release` | .github/workflows/release.yml | npm test |
| 6 | `ci: configure automated release pipeline with semantic-release` | All configuration files | npm test |
| 7 | `docs: add VSCE_PAT token setup documentation` | .sisyphus/notepads/github-actions-auto-publish/token-setup.md | None |

---

## Success Criteria

### Verification Commands
```bash
# Verify workflow runs
curl -s https://api.github.com/repos/vinaosb/opencode-antigravity-quota/actions/workflows | jq '.workflow_runs[0].name'

# Verify latest release
curl -s https://api.github.com/repos/vinaosb/opencode-antigravity-quota/releases/latest | jq '.tag_name, .name, .published_at'

# Verify package.json version
curl -s https://raw.githubusercontent.com/vinaosb/opencode-antigravity-quota/main/package.json | jq '.version'

# Verify CHANGELOG.md
curl -s https://raw.githubusercontent.com/vinaosb/opencode-antigravity-quota/main/CHANGELOG.md | head -20
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass in CI workflow
- [ ] Workflow runs on push to main
- [ ] semantic-release creates releases automatically
- [ ] Extension publishes to marketplace
- [ ] package.json version updated automatically
- [ ] CHANGELOG.md updated automatically
- [ ] GitHub release created with version tag
- [ ] Conventional Commits enforced via commitlint
- [ ] VSCE_PAT secret configured (user action)
- [ ] Documentation for token rotation provided

---

## Rollback Procedure (If Needed)

If automated publishing fails or publishes incorrect version:

1. **Unpublish from VS Code Marketplace**:
   - Visit: https://marketplace.visualstudio.com/manage/publishers/vinaosb/extensions/opencode-quota-monitor
   - Select the version to unpublish
   - Click "Unpublish" or "Delete"
   - Confirm action

2. **Disable GitHub Actions Workflow**:
   - Visit: https://github.com/vinaosb/opencode-antigravity-quota/actions/workflows/release.yml
   - Click "Disable workflow"
   - Confirm: Workflow stops triggering on push

3. **Revert version bump (if needed)**:
   ```bash
   git tag -l  # List all tags
   git tag -d vX.Y.Z  # Delete local tag
   git push origin :refs/tags/vX.Y.Z  # Delete remote tag
   git revert HEAD  # Revert last commit (if it updated version)
   git push origin main
   ```

4. **Re-enable workflow after fix**:
   - Fix the issue (configuration, commit messages, etc.)
   - Re-enable workflow in GitHub Actions UI
   - Verify next release succeeds

---

## Token Rotation Procedure

Annually or on suspected compromise:

1. **Create new VSCE_PAT**:
   - Follow steps in `.sisyphus/notepads/github-actions-auto-publish/token-setup.md`

2. **Update GitHub secret**:
   - Visit: https://github.com/vinaosb/opencode-antigravity-quota/settings/secrets/actions
   - Find VSCE_PAT secret
   - Click "Update"
   - Paste new token value
   - Click "Update secret"

3. **Revoke old token**:
   - Visit: https://dev.azure.com/_usersSettings/tokens
   - Find old token
   - Click "Revoke"
   - Confirm: Old token no longer valid

4. **Verify rotation**:
   - Push a test commit
   - Verify GitHub Actions workflow succeeds with new token
