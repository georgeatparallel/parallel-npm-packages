# AI SDK Dual-Version Support - Implementation Notes

## Overview

This package supports **both AI SDK v4 and v5** in a single npm package using npm package aliases. This provides genuine compatibility for both versions without requiring users to choose separate packages.

## How It Works

### NPM Package Aliases

```json
{
  "dependencies": {
    "ai-v4": "npm:ai@^4.0.0",
    "ai-v5": "npm:ai@^5.0.0"
  }
}
```

This syntax tells npm/pnpm to install two different versions of the `ai` package under different names:
- `ai-v4` → Installs `ai@4.3.19` (or latest 4.x)
- `ai-v5` → Installs `ai@5.0.76` (or latest 5.x)

### Separate Implementations

```
src/
├── v4/                    # AI SDK v4 implementation
│   ├── tools/
│   │   ├── search.ts     # import { tool } from 'ai-v4'
│   │   └── extract.ts    # Uses 'parameters' property
│   └── index.ts
├── v5/                    # AI SDK v5 implementation
│   ├── tools/
│   │   ├── search.ts     # import { tool } from 'ai-v5'
│   │   └── extract.ts    # Uses 'inputSchema' property
│   └── index.ts
└── index.ts               # Re-exports v5 by default
```

### Key API Differences

**AI SDK v4:**
```typescript
import { tool } from 'ai-v4';

tool({
  parameters: z.object({ ... }),  // v4 uses 'parameters'
  execute: async (args, { abortSignal }) => { ... }
})
```

**AI SDK v5:**
```typescript
import { tool } from 'ai-v5';

tool({
  inputSchema: z.object({ ... }),  // v5 uses 'inputSchema'
  execute: async (args, { abortSignal }) => { ... }
})
```

## Package Structure

### Conditional Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./v4": {
      "types": "./dist/v4.d.ts",
      "import": "./dist/v4.js",
      "require": "./dist/v4.cjs"
    },
    "./v5": {
      "types": "./dist/v5.d.ts",
      "import": "./dist/v5.js",
      "require": "./dist/v5.cjs"
    }
  }
}
```

### User Experience

Users import based on their AI SDK version:

```typescript
// Using AI SDK v5 in their project
import { searchTool } from '@parallel-web/ai-sdk-tools';
// or explicitly
import { searchTool } from '@parallel-web/ai-sdk-tools/v5';

// Using AI SDK v4 in their project
import { searchTool } from '@parallel-web/ai-sdk-tools/v4';
```

**Important:** Users still need to install their own version of `ai` in their project. Our bundled versions are only used internally by our tools.

## Benefits

✅ **True Compatibility** - Real v4 and v5 implementations, not fake compatibility  
✅ **Single Package** - Users only install one package  
✅ **No Peer Dependency Conflicts** - We bundle both versions internally  
✅ **Type Safety** - Full TypeScript support for both versions  
✅ **Clean API** - Simple, clear import paths  
✅ **Future-Proof** - Easy to add more versions if needed  

## Testing

Tests verify both versions work correctly:

```typescript
describe('v4 exports', () => {
  it('should use parameters property', async () => {
    const { searchTool } = await import('../v4/index.js');
    expect(searchTool).toHaveProperty('parameters');  // v4 API
  });
});

describe('v5 exports', () => {
  it('should use inputSchema property', async () => {
    const { searchTool } = await import('../v5/index.js');
    expect(searchTool).toHaveProperty('inputSchema');  // v5 API
  });
});
```

## Building

Build command: `pnpm build`

This creates:
- `dist/index.js` (ESM) + `dist/index.cjs` (CJS) - v5 default exports
- `dist/v4.js` (ESM) + `dist/v4.cjs` (CJS) - v4 exports
- `dist/v5.js` (ESM) + `dist/v5.cjs` (CJS) - v5 exports
- TypeScript declarations for all

## Maintenance

When AI SDK releases breaking changes:
1. Add new package alias (e.g., `ai-v6`)
2. Create new implementation directory (e.g., `src/v6/`)
3. Add conditional export in `package.json`
4. Add entry in `tsup.config.ts`
5. Update documentation

The approach scales cleanly to support multiple versions simultaneously.
