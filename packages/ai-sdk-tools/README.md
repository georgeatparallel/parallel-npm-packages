# @parallel-web/ai-sdk-tools

AI SDK tools for Parallel Web, built for Vercel's AI SDK v5.

## Installation

```bash
npm install ai @parallel-web/ai-sdk-tools
# or
pnpm add ai @parallel-web/ai-sdk-tools
# or
yarn add ai @parallel-web/ai-sdk-tools
```

> **Note:** This package requires AI SDK v5. For AI SDK v4, use `parameters` instead of `inputSchema` when defining tools manually with the `parallel-web` SDK.

## Usage

Add `PARALLEL_API_KEY` obtained from [Parallel Platform](https://platform.parallel.ai/settings?tab=api-keys) to your environment variables.

### Search Tool

`searchTool` uses [Parallel's Search API](https://docs.parallel.ai/api-reference/search-beta/search) to perform web searches and return LLM-optimized results.

**Input schema:**
- `objective` (required): Natural-language description of what the web search is trying to find
- `search_queries` (optional): List of keyword search queries (1-6 words each)
- `mode` (optional): `'agentic'` (default) for concise results in agentic loops, or `'one-shot'` for comprehensive single-response results

### Extract Tool

`extractTool` uses [Parallel's Extract API](https://docs.parallel.ai/api-reference/extract-beta/extract) to fetch and extract relevant content from specific URLs.

**Input schema:**
- `urls` (required): List of URLs to extract content from (max 10)
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

Create a search tool with custom defaults for mode, max_results, excerpts, source_policy, or fetch_policy.

```typescript
import { createSearchTool } from '@parallel-web/ai-sdk-tools';

const myCustomSearchTool = createSearchTool({
  mode: 'one-shot',            // 'one-shot' returns more comprehensive results and longer excerpts to answer questions from a single response.
  max_results: 5,              // Limit to 5 results
  apiKey: 'your-api-key',      // Optional: pass an API key, falls back to PARALLEL_API_KEY env variable
});
```

### createExtractTool

Create an extract tool with custom defaults for excerpts, full_content, or fetch_policy.

```typescript
import { createExtractTool } from '@parallel-web/ai-sdk-tools';

const myExtractTool = createExtractTool({
  full_content: true,          // Include full page content
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
    query: z.string().describe("The user's question"),
  }),
  execute: async ({ query }) => {
    const result = await parallel.beta.search({
      objective: query,
      mode: 'agentic',
      max_results: 5,
    });
    return result;
  },
});
```

## API Reference

- [Search API Documentation](https://docs.parallel.ai/search/search-quickstart)
- [Extract API Documentation](https://docs.parallel.ai/extract/extract-quickstart)
- [Search API Best Practices](https://docs.parallel.ai/search/best-practices)

## Response Format

Both tools return the raw API response from Parallel:

### Search Response

```typescript
{
  search_id: string;
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
  results: Array<{
    url: string;
    title?: string;
    excerpts?: string[];
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
