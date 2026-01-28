Task 4 - add GitHub Actions release workflow

- Created .github/workflows/release.yml with semantic-release step and npm test before release.
- Ensured actions/checkout@v4 with fetch-depth: 0 and actions/setup-node@v4 (node 20).
- Workflow triggers only on push to main as requested.
- yamllint not installed in environment; syntax check skipped.

Next steps:
- Commit the workflow and push to trigger CI; ensure secrets GITHUB_TOKEN and VSCE_PAT are set in repository settings.
