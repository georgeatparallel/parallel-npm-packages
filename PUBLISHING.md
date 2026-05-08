# Publishing Guide

This document provides detailed information about the npm publishing workflows and how to test them.

## Overview

This repository uses package-specific workflows for publishing to npm. Each package has its own dedicated workflows:

1. **Canary Publishing**: Manually triggered to publish pre-release versions
2. **Stable Publishing**: Manually triggered to publish stable releases

**Current packages:**
- `@parallel-web/ai-sdk-tools` - AI SDK tools for Parallel Web
- `@parallel-web/opencode-plugin` - Opencode plugin for Parallel Web
- `@parallel-web/pi-extension` - Pi extension for Parallel Web

**Note**: This monorepo is designed to support multiple packages. When adding new packages, create dedicated workflows following the naming pattern: `publish-{package-name}-canary.yml` and `publish-{package-name}-stable.yml`.

## Workflow Architecture

### Canary Workflow (`.github/workflows/publish-ai-sdk-tools-canary.yml`)

**Package**: `@parallel-web/ai-sdk-tools`

**Trigger**: Manual via GitHub Actions UI

**Process**:
1. Runs package-specific CI suite:
   - Lints `packages/ai-sdk-tools`
   - Format checks `packages/ai-sdk-tools`
   - Type checks `packages/ai-sdk-tools`
   - Runs tests for `packages/ai-sdk-tools`
   - Builds `packages/ai-sdk-tools`
2. Calculates canary version by:
   - Reading current version from `packages/ai-sdk-tools/package.json` (e.g., `1.2.3`)
   - Bumping patch version (e.g., `1.2.4`)
   - Appending `-canary.{shortSHA}` (e.g., `1.2.4-canary.abc1234`)
3. Publishes to npm with `--tag canary`
4. Does NOT commit changes to git

**Result**: Package available as `@parallel-web/ai-sdk-tools@canary`

### Stable Workflow (`.github/workflows/publish-ai-sdk-tools-stable.yml`)

**Package**: `@parallel-web/ai-sdk-tools`

**Trigger**: Manual via GitHub Actions UI

**Prerequisites**:
1. Version must be manually bumped in `packages/ai-sdk-tools/package.json` via a PR
2. PR must be merged to `main` before triggering the workflow

**Process**:
1. Runs package-specific CI suite:
   - Lints `packages/ai-sdk-tools`
   - Format checks `packages/ai-sdk-tools`
   - Type checks `packages/ai-sdk-tools`
   - Runs tests for `packages/ai-sdk-tools`
   - Builds `packages/ai-sdk-tools`
2. Reads current version from `packages/ai-sdk-tools/package.json`
3. Verifies that version tag doesn't already exist
4. Generates changelog from conventional commits since last tag
5. Creates git tag: `v{version}`
6. Pushes tag to repository (no commits to `main`)
7. Publishes to npm with `--tag latest`
8. Creates GitHub Release with changelog

**Result**: New stable version published and tagged in git (no version bump commits)

## How to Create a Stable Release

Follow these steps to publish a new stable version:

### Step 1: Create a Release PR

1. Create a new branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b release/v0.2.0  # Use the new version number
   ```

2. Bump the version in `packages/ai-sdk-tools/package.json`:
   ```bash
   cd packages/ai-sdk-tools
   npm version patch  # or 'minor' or 'major'
   # This updates package.json and pnpm-lock.yaml
   ```
   
   Or manually edit `package.json` to set the desired version.

3. Commit the version bump:
   ```bash
   git add .
   git commit -m "chore: bump version to v0.2.0"
   ```

4. Push the branch and create a PR:
   ```bash
   git push origin release/v0.2.0
   ```

5. Create a PR with title: `chore: release v0.2.0`

6. Wait for CI to pass and get the PR reviewed/approved

7. Merge the PR to `main`

### Step 2: Trigger the Publish Workflow

1. Go to the [Actions tab](https://github.com/shapleyai/parallel-web-npm-packages/actions)

2. Select "Publish ai-sdk-tools Stable" workflow

3. Click "Run workflow"

4. Select `main` branch

5. Check the confirmation checkbox

6. Click "Run workflow"

### Step 3: Verify the Release

The workflow will:
- Run all tests and checks
- Create a git tag (e.g., `v0.2.0`)
- Publish to npm as `@parallel-web/ai-sdk-tools@0.2.0`
- Create a GitHub Release with auto-generated changelog

Verify the release:
```bash
# Check npm
npm view @parallel-web/ai-sdk-tools version

# Check git tags
git fetch --tags
git tag -l

# Check GitHub Releases
# Visit: https://github.com/shapleyai/parallel-web-npm-packages/releases
```

## Testing the Workflows

### Prerequisites

1. **Set up npm token** (see Setup section below)
2. **Enable GitHub Actions** in repository settings
3. **Protect main branch** (recommended but not required for testing)

### Testing Canary Publishing

#### Option 1: Test on a Feature Branch (Recommended for Initial Testing)

Modify the workflow temporarily to test without affecting main:

```yaml
# In .github/workflows/publish-ai-sdk-tools-canary.yml
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
3. Watch Actions tab for "Publish ai-sdk-tools Canary" workflow
4. Check npm registry: `npm view @parallel-web/ai-sdk-tools@canary`

### Testing Stable Publishing

#### Option 1: Dry Run on a Test Branch

Test the entire workflow without affecting main:

1. Create a test branch:
```bash
git checkout -b test-release
```

2. Bump version to a test version:
```bash
cd packages/ai-sdk-tools
npm version 0.0.0-test.1 --no-git-tag-version
git add package.json
git commit -m "test: version bump"
git push origin test-release
```

3. Temporarily modify `.github/workflows/publish-ai-sdk-tools-stable.yml` to:
   - Trigger on push to `test-release` branch
   - Add `--dry-run` flag to npm publish step

4. Push and observe the workflow run

#### Option 2: Manual Local Testing

Test the release process locally before running in CI:

```bash
# Simulate the workflow steps
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test:ci
pnpm build

# Test version reading
cd packages/ai-sdk-tools
VERSION=$(node -p "require('./package.json').version")
echo "Version: $VERSION"

# Test tag creation (don't push)
git tag -a "v${VERSION}-test" -m "Test release"
git tag -d "v${VERSION}-test"  # Clean up

# Test npm publish (dry run)
npm publish --dry-run --tag latest --access public
```

#### Option 3: Test on a Fork

1. Fork the repository
2. Set up the npm token in fork secrets
3. Run the workflow on the fork
4. Verify it works before applying to main repository

### Validation Checklist

Before publishing a stable release:

- [ ] Version bumped in `packages/ai-sdk-tools/package.json`
- [ ] Version follows semantic versioning (e.g., `0.2.0`)
- [ ] Version doesn't already have a git tag
- [ ] Release PR merged to `main`
- [ ] All tests pass locally: `pnpm test:ci`
- [ ] Build succeeds: `pnpm build`
- [ ] npm token is set correctly in GitHub secrets (`NPM_PARALLEL_DEVELOPERS_PASSWORD`)
- [ ] Token has correct permissions (publish access to `@parallel-web/ai-sdk-tools`)

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

### Tag already exists error

**Cause**: The version in `package.json` already has a corresponding git tag.

**Solution**: 
1. Check existing tags: `git tag -l`
2. Bump the version in `package.json` to a new version
3. Create a new release PR with the updated version
4. Merge and re-run the workflow

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
2. **Create release PRs** to bump versions - never commit directly to main
3. **Test canary versions** before promoting to stable
4. **Review changelog preview** in workflow logs before GitHub Release creation
5. **Use patch** for backwards-compatible bug fixes (0.1.0 → 0.1.1)
6. **Use minor** for new features that are backwards-compatible (0.1.0 → 0.2.0)
7. **Use major** for breaking changes (0.1.0 → 1.0.0)
8. **Keep main branch stable** - all tests should pass before merging
9. **Tag naming convention** - all tags should be prefixed with `v` (e.g., `v0.2.0`)
10. **Monitor npm download stats** to understand usage patterns

## Security Considerations

- ✅ npm token stored as GitHub secret (encrypted)
- ✅ Token uses "Automation" type (no 2FA required in CI)
- ✅ Workflows run with minimal permissions
- ✅ No token exposure in logs
- ✅ Full CI validation before every publish
- ✅ Git tags provide immutable release history
- ✅ Conventional commits provide audit trail
- ✅ Version changes require PR review (respects branch protection)
- ✅ No automated commits to main branch (tag-only workflow)

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
