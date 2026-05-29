# @parallel-web/ai-sdk-tools

AI SDK tools for Parallel Web, built for Vercel's AI SDK v6.

## Installation

```bash
npm install ai @parallel-web/ai-sdk-tools
# or
pnpm add ai @parallel-web/ai-sdk-tools
# or
yarn add ai @parallel-web/ai-sdk-tools
```

> **Note:** This package requires AI SDK v6. If you're still on AI SDK v5, install the last v5-compatible release instead: `npm install @parallel-web/ai-sdk-tools@0.2.1`.

## Usage

Add `PARALLEL_API_KEY` obtained from [Parallel Platform](https://platform.parallel.ai/settings?tab=api-keys) to your environment variables.

### Search Tool

`searchTool` uses [Parallel's v1 Search API](https://docs.parallel.ai/api-reference/search/search) to perform web searches and return LLM-optimized results.

**Input schema:**
- `search_queries` (required): List of concise keyword search queries (3-6 words each, at least one, max 5). Provide 2-3 for best results.
- `objective` (optional): Natural-language description of the underlying question or goal driving the search. Recommended alongside `search_queries` for best results.
- `mode` (optional): `'advanced'` (default) for higher quality with advanced retrieval and compression, or `'basic'` for the lowest latency

### Extract Tool

`extractTool` uses [Parallel's v1 Extract API](https://docs.parallel.ai/api-reference/extract/extract) to fetch and extract relevant content from specific URLs.

**Input schema:**
- `urls` (required): List of URLs to extract content from (max 20)
- `objective` (optional): Natural-language description of what information you're looking for

### Basic Example

```typescript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { searchTool, extractTool } from '@parallel-web/ai-sdk-tools';

const result = streamText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'user', content: 'What are the latest developments in AI?' },
  ],
  tools: {
    'web-search': searchTool,
    'web-extract': extractTool,
  },
  toolChoice: 'auto',
});

// Stream the response
return result.toUIMessageStreamResponse();
```

## Factory Functions

For more control over the tool configuration, use the factory functions to create tools with custom defaults.

> **Note:** Both factory functions accept an optional `apiKey` parameter. If not provided, they fall back to the `PARALLEL_API_KEY` environment variable.

### createSearchTool

Create a search tool with custom defaults for `mode`, `max_chars_total`, `client_model`, and advanced settings (`max_results`, `excerpts`, `location`, `source_policy`, `fetch_policy`). Advanced settings are nested under `advanced_settings` in the v1 API; pass them as flat options here and they're assembled for you.

> **Best practice:** Use advanced settings only when strictly required — restrictive parameters such as `source_policy`, `location`, and `max_results` can unnecessarily limit results and reduce quality.

```typescript
import { createSearchTool } from '@parallel-web/ai-sdk-tools';

const myCustomSearchTool = createSearchTool({
  mode: 'basic',               // 'basic' offers the lowest latency; 'advanced' (default) is higher quality
  max_results: 5,              // Limit to 5 results (nested under advanced_settings)
  client_model: 'gpt-4o',      // Optional: tailor result formatting to the consuming model
  apiKey: 'your-api-key',      // Optional: pass an API key, falls back to PARALLEL_API_KEY env variable
});
```

### createExtractTool

Create an extract tool with custom defaults for `excerpts`, `full_content`, `fetch_policy`, `max_chars_total`, and `client_model`. In the v1 API excerpts are always returned; their size is controlled via `excerpts`.

```typescript
import { createExtractTool } from '@parallel-web/ai-sdk-tools';

const myExtractTool = createExtractTool({
  full_content: true,          // Include full page content (nested under advanced_settings)
  excerpts: {
    max_chars_per_result: 10000,
  },
  apiKey: 'your-api-key',      // Optional: pass an API key, falls back to PARALLEL_API_KEY env variable
});
```

## Direct API Usage

You can also use the `parallel-web` SDK directly for maximum flexibility:

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';

const parallel = new Parallel({
  apiKey: process.env.PARALLEL_API_KEY,
});

const webSearch = tool({
  description: 'Search the web for information.',
  inputSchema: z.object({
    search_queries: z.array(z.string()).min(1).describe('Keyword search queries'),
    objective: z.string().nullable().optional().describe("The user's question"),
  }),
  execute: async ({ search_queries, objective }) => {
    const result = await parallel.search({
      search_queries,
      objective,
      mode: 'advanced',
      advanced_settings: { max_results: 5 },
    });
    return result;
  },
});
```

## API Reference

- [Search API Reference](https://docs.parallel.ai/api-reference/search/search)
- [Extract API Reference](https://docs.parallel.ai/api-reference/extract/extract)
- [Search API Best Practices](https://docs.parallel.ai/search/best-practices)
- [Extract API Best Practices](https://docs.parallel.ai/extract/best-practices)

## Response Format

Both tools return the raw API response from Parallel:

### Search Response

```typescript
{
  search_id: string;
  session_id: string;
  results: Array<{
    url: string;
    title?: string;
    publish_date?: string;
    excerpts: string[];
  }>;
  usage?: Array<{ name: string; count: number }>;
  warnings?: Array<{ code: string; message: string }>;
}
```

### Extract Response

```typescript
{
  extract_id: string;
  session_id: string;
  results: Array<{
    url: string;
    title?: string;
    excerpts: string[];
    full_content?: string;
    publish_date?: string;
  }>;
  errors: Array<{
    url: string;
    error_type: string;
    http_status_code?: number;
    content?: string;
  }>;
  usage?: Array<{ name: string; count: number }>;
  warnings?: Array<{ code: string; message: string }>;
}
```

## Migration to v1.0.0 (AI SDK v6 + v1 Search/Extract API)

Version 1.0.0 targets [AI SDK v6](https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0) and Parallel's v1 [Search](https://docs.parallel.ai/search/search-migration-guide) and [Extract](https://docs.parallel.ai/extract/extract-migration-guide) APIs (`parallel-web@^0.5.0`). If you need AI SDK v5, install `@parallel-web/ai-sdk-tools@0.2.1`.

### searchTool changes

- **`search_queries` is now required** (at least one query); `objective` is optional but recommended alongside it.
- **`mode` values changed** from `'agentic'`/`'one-shot'` to `'basic'`/`'advanced'`, defaulting to `'advanced'`. Map `'agentic'`/`'one-shot'` → `'basic'`.
- **`createSearchTool` advanced options** (`max_results`, `excerpts`, `source_policy`, `fetch_policy`, plus the new `location`) are now sent under `advanced_settings`; new top-level options `max_chars_total` and `client_model` are also available. You still pass them as flat options.

### extractTool changes

- **Up to 20 URLs** per request (was 10).
- **Excerpts are always returned**; the `excerpts` option no longer accepts a boolean — pass excerpt settings (e.g. `{ max_chars_per_result }`) to control size.
- **`createExtractTool` options** `full_content` and `fetch_policy` are now sent under `advanced_settings`; new top-level options `max_chars_total` and `client_model` are also available.

## Migration from v0.1.x

Version 0.2.0 introduces an updated API that conforms with Parallel's Search and Extract MCP tools:

### searchTool changes

- **Input schema changed**: Removed `search_type` and `include_domains`. Added `mode` parameter.
- **Return value changed**: Now returns raw API response (`{ search_id, results, ... }`) instead of `{ searchParams, answer }`.

**Before (v0.1.x):**
```typescript
const result = await searchTool.execute({
  objective: 'Find TypeScript info',
  search_type: 'list',
  search_queries: ['TypeScript'],
  include_domains: ['typescriptlang.org'],
});
console.log(result.answer.results);
```

**After (v0.2.0):**
```typescript
const result = await searchTool.execute({
  objective: 'Find TypeScript info',
  search_queries: ['TypeScript'],
  mode: 'agentic', // optional, defaults to 'agentic'
});
console.log(result.results);
```

### extractTool changes

- **Input schema changed**: `urls` is now first, `objective` is optional.
- **Return value changed**: Now returns raw API response (`{ extract_id, results, errors, ... }`) instead of `{ searchParams, answer }`.

**Before (v0.1.x):**
```typescript
const result = await extractTool.execute({
  objective: 'Extract content',
  urls: ['https://example.com'],
  search_queries: ['keyword'],
});
console.log(result.answer.results);
```

**After (v0.2.0):**
```typescript
const result = await extractTool.execute({
  urls: ['https://example.com'],
  objective: 'Extract content', // optional
});
console.log(result.results);
```
