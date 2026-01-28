Installed devDependencies for semantic-release and commitlint

Packages added (top-level):
- semantic-release@24.2.9
- @semantic-release/changelog@6.0.3
- @semantic-release/commit-analyzer@13.0.1
- @semantic-release/git@10.0.1
- @semantic-release/github@11.0.6
- @semantic-release/release-notes-generator@14.1.0
- semantic-release-vsce@6.0.22
- @commitlint/cli@20.3.1
- @commitlint/config-conventional@20.3.1
- husky@9.1.7

Notes:
- Used single npm install command to add all packages with --save-dev
- package-lock.json updated and npm list --depth=0 shows the installed top-level packages
- npm reported 15 vulnerabilities; recommend running `npm audit fix` and reviewing high vulnerabilities separately

Next steps:
- Configure semantic-release settings and GitHub token in CI
- Add commitlint config and husky hooks

Task 2 (commitlint + husky):
- Created .commitlintrc extending @commitlint/config-conventional
- Added "prepare": "husky install" script to package.json
- Created .husky/commit-msg that runs `npx --no -- commitlint --edit $1`
- Verified invalid commit messages are rejected and valid conventional commits succeed
- Notes: On Windows Git, git update-index --chmod may report errors; hook file created and committed successfully
