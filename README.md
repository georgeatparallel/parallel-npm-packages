# @parallel-web npm packages

Monorepo for @parallel-web npm packages.

## Packages

- [`@parallel-web/ai-sdk-tools`](./packages/ai-sdk-tools) - AI SDK tools for Parallel Web

## Development

This is a pnpm monorepo. Make sure you have pnpm installed:

```bash
npm install -g pnpm
```

### Setup

Install dependencies:

```bash
pnpm install
```

### Commands

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests in CI mode (no watch)
pnpm test:ci

# Lint
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Check formatting
pnpm format:check

# Type check
pnpm typecheck

# Clean build artifacts
pnpm clean
```

### Workspace Commands

To run a command in a specific package:

```bash
pnpm --filter @parallel-web/ai-sdk-tools build
pnpm --filter @parallel-web/ai-sdk-tools test
```

### Adding a New Package

1. Create a new directory in `packages/`
2. Add a `package.json` with the package name `@parallel-web/package-name`
3. Set up TypeScript config extending from root
4. Add build configuration (tsup)
5. Implement your package

## Publishing

Packages are published to npm using automated GitHub Actions workflows.

### Canary Releases 

Every push to `main` can be published to a canary release with version format `x.y.z-canary.{shortSHA}`.

- Published with the `canary` npm dist-tag
- Does not modify `package.json` in git
- Includes full CI validation before publishing

**Install canary version:**
```bash
npm install @parallel-web/ai-sdk-tools@canary
```

### Stable Releases (Manual)

Stable releases are triggered manually via GitHub Actions:

1. Go to **Actions** → **Publish Stable Release** → **Run workflow**
2. Select version bump type:
   - `patch`: Bug fixes (1.2.3 → 1.2.4)
   - `minor`: New features (1.2.3 → 1.3.0)
   - `major`: Breaking changes (1.2.3 → 2.0.0)
3. Workflow will:
   - Run full test suite
   - Bump version in `package.json`
   - Generate changelog from conventional commits
   - Create git tag and commit
   - Publish to npm with `latest` tag
   - Create GitHub release

**Install stable version:**
```bash
npm install @parallel-web/ai-sdk-tools
```

### Conventional Commits

For proper changelog generation, follow conventional commit format:

- `feat: add new feature` → triggers minor version bump
- `fix: resolve bug` → triggers patch version bump
- `feat!: breaking change` or `BREAKING CHANGE:` → triggers major version bump

### Setup (Maintainers Only)

Required GitHub repository secret:

- **Name**: `NPM_PARALLEL_DEVELOPERS_PASSWORD`
- **Value**: npm automation token from `developers@parallel.ai` account
- **How to create**:
  1. Log into npmjs.com with `developers@parallel.ai`
  2. Go to Account Settings → Access Tokens
  3. Generate New Token → Select **Automation** type
  4. Copy token and add to GitHub repository secrets

## License

MIT

