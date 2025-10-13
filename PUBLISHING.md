# Publishing Guide

This document provides detailed information about the npm publishing workflows and how to test them.

## Overview

This repository uses two automated workflows for publishing packages to npm:

1. **Canary Publishing**: Automatically publishes pre-release versions on every push to `main`
2. **Stable Publishing**: Manually triggered to publish stable releases

## Workflow Architecture

### Canary Workflow (`.github/workflows/publish-canary.yml`)

**Trigger**: Automatically on push to `main`

**Process**:
1. Runs full CI suite (lint, format check, typecheck, tests, build)
2. Calculates canary version by:
   - Reading current version from `package.json` (e.g., `1.2.3`)
   - Bumping patch version (e.g., `1.2.4`)
   - Appending `-canary.{shortSHA}` (e.g., `1.2.4-canary.abc1234`)
3. Publishes to npm with `--tag canary`
4. Does NOT commit changes to git

**Result**: Package available as `@parallel-web/ai-sdk-tools@canary`

### Stable Workflow (`.github/workflows/publish-stable.yml`)

**Trigger**: Manual via GitHub Actions UI

**Process**:
1. Runs full CI suite
2. Bumps version in `package.json` based on input (patch/minor/major)
3. Generates changelog from conventional commits
4. Commits version bump with message: `chore: release v{version}`
5. Creates git tag: `v{version}`
6. Pushes commit and tag to `main`
7. Publishes to npm with `--tag latest`
8. Creates GitHub Release with changelog

**Result**: New stable version published and tagged in git

## Testing the Workflows

### Prerequisites

1. **Set up npm token** (see Setup section below)
2. **Enable GitHub Actions** in repository settings
3. **Protect main branch** (recommended but not required for testing)

### Testing Canary Publishing

#### Option 1: Test on a Feature Branch (Recommended for Initial Testing)

Modify the workflow temporarily to test without affecting main:

```yaml
# In .github/workflows/publish-canary.yml
on:
  push:
    branches: [main, test-canary]  # Add test branch
```

Then:
```bash
git checkout -b test-canary
git push origin test-canary
```

Watch the workflow run in Actions tab.

#### Option 2: Dry Run Test

Add a dry-run step before actual publishing:

```yaml
- name: Dry run publish
  run: |
    cd packages/ai-sdk-tools
    npm publish --dry-run --tag canary
```

This shows what would be published without actually publishing.

#### Option 3: Test on Real Main Branch

If you're confident:
1. Make any commit to main
2. Push to GitHub
3. Watch Actions tab for "Publish Canary" workflow
4. Check npm registry: `npm view @parallel-web/ai-sdk-tools@canary`

### Testing Stable Publishing

#### Option 1: Dry Run First

Modify the workflow to add dry-run mode:

1. Add input parameter:
```yaml
inputs:
  dry-run:
    description: 'Dry run (do not actually publish)'
    required: false
    type: boolean
    default: false
```

2. Modify publish step:
```yaml
- name: Publish to npm
  run: |
    cd packages/ai-sdk-tools
    if [ "${{ inputs.dry-run }}" = "true" ]; then
      npm publish --dry-run --tag latest --access public
    else
      npm publish --tag latest --access public
    fi
```

#### Option 2: Test Version Bumping Only

Comment out the publish and push steps temporarily:

```yaml
# - name: Push changes
#   run: |
#     git push origin main

# - name: Publish to npm
#   run: |
#     cd packages/ai-sdk-tools
#     npm publish --tag latest --access public
```

This lets you test:
- Version calculation
- Changelog generation
- Git operations

Without actually publishing or modifying the repository.

#### Option 3: Test on a Fork

1. Fork the repository
2. Set up the npm token in fork secrets
3. Run the workflow on the fork
4. Verify it works before applying to main repository

### Validation Checklist

Before running workflows in production:

- [ ] npm token is set correctly in GitHub secrets
- [ ] Token has correct permissions (publish access to `@parallel-web/ai-sdk-tools`)
- [ ] Current `package.json` version is correct (e.g., `0.1.0`)
- [ ] All tests pass locally: `pnpm test:ci`
- [ ] Build succeeds: `pnpm build`
- [ ] Git user email is correct in workflow: `developers@parallel.ai`

## Setup Instructions

### 1. Create npm Automation Token

1. Log into [npmjs.com](https://npmjs.com) with `developers@parallel.ai`
2. Navigate to: **Account Settings** → **Access Tokens**
3. Click **Generate New Token**
4. Select **Automation** type (recommended for CI/CD)
5. Give it a descriptive name: `GitHub Actions - parallel-web-npm-packages`
6. Copy the token (starts with `npm_...`)

### 2. Add Token to GitHub

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `NPM_PARALLEL_DEVELOPERS_PASSWORD`
4. Value: Paste the npm token
5. Click **Add secret**

### 3. Verify Token Permissions

The token must have:
- **Publish** access to `@parallel-web/ai-sdk-tools`
- **Read** access to package metadata

You can verify this by checking the npm organization settings.

## Troubleshooting

### Canary publish fails with "version already exists"

**Cause**: The git SHA creates a unique version, so this is rare. May happen if workflow runs twice for the same commit.

**Solution**: Re-run the workflow or push a new commit.

### Stable publish fails with "permission denied"

**Cause**: npm token doesn't have publish permissions.

**Solution**: 
1. Verify token in npm settings
2. Check organization membership for `developers@parallel.ai`
3. Regenerate token if needed

### Git push fails in stable workflow

**Cause**: Branch protection rules may prevent bot from pushing.

**Solution**: 
- Add GitHub Actions bot to branch protection bypass list, OR
- Use a Personal Access Token (PAT) with repo permissions instead of `GITHUB_TOKEN`

### Changelog is empty

**Cause**: No conventional commits found between versions.

**Solution**: Ensure commits follow format:
- `feat: description`
- `fix: description`
- `chore: description`

### Tests fail during publish

**Cause**: Code has issues or environment variables missing.

**Solution**:
1. Ensure `PARALLEL_API_KEY` secret is set (for tests)
2. Run tests locally first: `pnpm test:ci`
3. Check workflow logs for specific error

## npm Dist-Tags

The package uses npm dist-tags to manage different release channels:

- **`latest`**: Stable releases (default when running `npm install`)
- **`canary`**: Pre-release builds (requires explicit `@canary` to install)

View all tags:
```bash
npm dist-tag ls @parallel-web/ai-sdk-tools
```

Output example:
```
canary: 1.2.4-canary.abc1234
latest: 1.2.3
```

## Monitoring Releases

### Check Published Versions

```bash
# View all versions
npm view @parallel-web/ai-sdk-tools versions

# View latest stable
npm view @parallel-web/ai-sdk-tools version

# View canary
npm view @parallel-web/ai-sdk-tools dist-tags
```

### Verify Package Contents

```bash
# Download and inspect without installing
npm pack @parallel-web/ai-sdk-tools@canary
tar -tzf parallel-web-ai-sdk-tools-*.tgz
```

### GitHub Actions Logs

Monitor workflows at:
```
https://github.com/parallel-web/npm-packages/actions
```

## Best Practices

1. **Always use conventional commits** for automatic changelog generation
2. **Test canary versions** before promoting to stable
3. **Review changelog** before stable releases
4. **Use patch** for backwards-compatible bug fixes
5. **Use minor** for new features (backwards-compatible)
6. **Use major** for breaking changes
7. **Keep main branch stable** - all tests should pass
8. **Monitor npm download stats** to understand usage

## Security Considerations

- ✅ npm token stored as GitHub secret (encrypted)
- ✅ Token uses "Automation" type (no 2FA required in CI)
- ✅ Workflows run with minimal permissions
- ✅ No token exposure in logs
- ✅ Full CI validation before every publish
- ✅ Git tags provide immutable release history
- ✅ Conventional commits provide audit trail

## Emergency Procedures

### Unpublish a Bad Release

⚠️ **Use with extreme caution** - npm unpublish is discouraged

```bash
npm unpublish @parallel-web/ai-sdk-tools@1.2.4
```

**Better alternative**: Publish a patch version with fix

### Deprecate a Version

```bash
npm deprecate @parallel-web/ai-sdk-tools@1.2.4 "Critical bug, use 1.2.5 instead"
```

### Roll Back to Previous Version

Move the `latest` tag to a previous version:

```bash
npm dist-tag add @parallel-web/ai-sdk-tools@1.2.3 latest
```

## Support

For issues with publishing:
1. Check workflow logs in GitHub Actions
2. Verify npm token permissions
3. Review this guide's troubleshooting section
4. Contact repository maintainers

