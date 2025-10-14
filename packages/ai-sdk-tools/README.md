# @parallel-web/ai-sdk-tools

AI SDK tools for Parallel Web.

## Installation

```bash
npm install @parallel-web/ai-sdk-tools
# or
pnpm add @parallel-web/ai-sdk-tools
# or
yarn add @parallel-web/ai-sdk-tools
```

## Usage

Add `PARALLEL_API_KEY` obtained from [Parallel Platform](https://platform.parallel.ai/settings?tab=api-keys) to your environment variables.

### Search Tool

`searchTool` uses [Parallel's web search API](https://docs.parallel.ai/api-reference/search-api/search) to get fresh relevant search results.

### With Vercel AI SDK

The `searchTool` integrates seamlessly with Vercel's AI SDK for tool calling:

```typescript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { searchTool } from '@parallel-web/ai-sdk-tools';

const result = streamText({
  model: openai('gpt-4o'),
  messages: [
    { role: 'user', content: 'What are the latest developments in AI?' }
  ],
  tools: {
    'web-search': searchTool,
  },
  toolChoice: 'auto',
});

// Stream the response
return result.toDataStreamResponse();
```

### Next.js Simple Route Handler Example

```typescript
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages } from 'ai';
import { searchTool } from '@parallel-web/ai-sdk-tools';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages: convertToModelMessages(messages),
    tools: {
      'web-search': searchTool,
    },
    toolChoice: 'auto',
  });

  return result.toDataStreamResponse();
}
```

### Scaffolded Tools

If your tool-calling LLM doesn't choose the right arguments for the searchTool, you may scaffold it or create another one to your own liking. Here's an example of a `simpleCompactSearchTool` that returns smaller snippets, with max of 10 results, for simple queries.

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';

const parallel = new Parallel({
  apiKey: process.env.PARALLEL_API_KEY,
});

// Custom scaffolded search tool with constrained parameters
export const simpleCompactSearchTool = tool({
  description: 'Compact search tool that returns concise results from web searches.',
  parameters: z.object({
    objective: z
      .string()
      .describe('What you are trying to find with this search'),
    search_queries: z
      .array(z.string())
      .optional()
      .describe('Optional keyword search queries'),
  }),
  execute: async ({ objective, search_queries }, { abortSignal }) => {
    const results = await parallel.beta.search(
      {
        objective,
        search_queries,
        max_results: 10, // Fixed at 10 results
        max_chars_per_result: 500, // Smaller snippets (500 chars vs default 6000)
        processor: 'base', // Use base processor for faster responses
      },
      { signal: abortSignal }
    );

    return {
      searchParams: { objective, search_queries },
      answer: results,
    };
  },
});

// Usage in your route
const result = streamText({
  model: openai('gpt-4o'),
  messages,
  tools: {
    'simple-web-search-with-compact-results': simpleCompactSearchTool,
  },
  toolChoice: 'auto',
});
```


