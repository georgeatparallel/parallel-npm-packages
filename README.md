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

Packages are published to npm with public access. Make sure you're logged in to npm:

```bash
npm login
```

To publish a package:

```bash
cd packages/package-name
pnpm build
npm publish
```

## License

MIT

