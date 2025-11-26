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

> **Note:** This package requires AI SDK v5. If you're using AI SDK v4, see the [AI SDK v4 Implementation](#ai-sdk-v4-implementation) section below.

## Usage

Add `PARALLEL_API_KEY` obtained from [Parallel Platform](https://platform.parallel.ai/settings?tab=api-keys) to your environment variables.

### Search Tool

`searchTool` uses [Parallel's web search API](https://docs.parallel.ai/api-reference/search-api/search) to get fresh relevant search results.

### Extract Tool

`extractTool` uses [Parallel's extract API](https://docs.parallel.ai/api-reference/search-and-extract-api-beta/extract) to extract a web-page's content, for a given objective.

### Basic Example

```typescript
import { openai } from '@ai-sdk/openai';
import { streamText, type Tool } from 'ai';
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

### Custom Tools

You can create custom tools that wrap the Parallel Web API:

```typescript
import { tool, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';

const parallel = new Parallel({
  apiKey: process.env.PARALLEL_API_KEY,
});

const webSearch = tool({
  description: 'Use this tool to search the web.',
  inputSchema: z.object({
    searchQueries: z.array(z.string()).describe('Search queries'),
    usersQuestion: z.string().describe("The user's question"),
  }),
  execute: async ({ searchQueries, usersQuestion }) => {
    const search = await parallel.beta.search({
      objective: usersQuestion,
      search_queries: searchQueries,
      max_results: 3,
      max_chars_per_result: 1000,
    });
    return search.results;
  },
});
```

## AI SDK v4 Implementation

If you're using AI SDK v4, you can implement the tools manually using the Parallel Web API. The key difference is that v4 uses `parameters` instead of `inputSchema`.

### Search Tool (v4)

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';

const parallel = new Parallel({
  apiKey: process.env.PARALLEL_API_KEY,
});

function getSearchParams(
  search_type: 'list' | 'targeted' | 'general' | 'single_page'
): Pick<BetaSearchParams, 'max_results' | 'max_chars_per_result'> {
  switch (search_type) {
    case 'targeted':
      return {
        max_results: 5,
        max_chars_per_result: 16000
      };
    case 'general':
      return {
        max_results: 10,
        max_chars_per_result: 9000
      };
    case 'single_page':
      return {
        max_results: 2,
        max_chars_per_result: 30000
      };
    case 'list':
    default:
      return {
        max_results: 20,
        max_chars_per_result: 1500
      };
  }
}

const searchTool = tool({
  description: `Use the web_search_parallel tool to access information from the web. The
web_search_parallel tool returns ranked, extended web excerpts optimized for LLMs.
Intelligently scale the number of web_search_parallel tool calls to get more information
when needed, from a single call for simple factual questions to five or more calls for
complex research questions.`,
  parameters: z.object({  // v4 uses parameters instead of inputSchema
    objective: z.string().describe(
      'Natural-language description of what the web research goal is.'
    ),
    search_type: z
      .enum(['list', 'general', 'single_page', 'targeted'])
      .optional()
      .default('list'),
    search_queries: z
      .array(z.string())
      .optional()
      .describe('List of keyword search queries of 1-6 words.'),
    include_domains: z
      .array(z.string())
      .optional()
      .describe('List of valid URL domains to restrict search results.'),
  }),
  execute: async (
    { ...args },
    { abortSignal }: { abortSignal?: AbortSignal }
  ) => {
    const results = const results = await search(
      { ...args, ...getSearchParams(args.search_type) },
      { abortSignal }
    );
    return {
      searchParams: { objective, search_type, search_queries, include_domains },
      answer: results,
    };
  },
});
```

### Extract Tool (v4)

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';

const parallel = new Parallel({
  apiKey: process.env.PARALLEL_API_KEY,
});

const extractTool = tool({
  description: `Purpose: Fetch and extract relevant content from specific web URLs.

Ideal Use Cases:
- Extracting content from specific URLs you've already identified
- Exploring URLs returned by a web search in greater depth`,
  parameters: z.object({
    // v4 uses parameters instead of inputSchema
    objective: z
      .string()
      .describe(
        "Natural-language description of what information you're looking for from the URLs."
      ),
    urls: z
      .array(z.string())
      .describe(
        'List of URLs to extract content from. Maximum 10 URLs per request.'
      ),
    search_queries: z
      .array(z.string())
      .optional()
      .describe('Optional keyword search queries related to the objective.'),
  }),
  execute: async ({ objective, urls, search_queries }) => {
    const results = await parallel.beta.extract({
      objective,
      urls,
      search_queries,
    });
    return {
      searchParams: { objective, urls, search_queries },
      answer: results,
    };
  },
});
```
