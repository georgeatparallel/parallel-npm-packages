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

If your tool-calling LLM doesn't choose the right arguments for the searchTool, you may scaffold it further or create another one to your own liking. Here's an example of a `webSearch` that returns smaller snippets, with max of 3 results, for simple queries.

```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';

const parallel = new Parallel({
  apiKey: process.env.PARALLEL_API_KEY,
});

// Custom
const webSearch = tool({
  description: 'Use this tool to search the web.',
  inputSchema: z.object({
    searchQueries: z
      .array(z.string())
      .describe(
        "Array (max 3) of search queries to help answer the user's question",
      ),
    usersQuestion: z.string().describe("The user's question phrased as an objective."),
  }),
  execute: async ({ searchQueries, usersQuestion }) => {
    const search = await client.beta.search({
      objective: usersQuestion,
      search_queries: searchQueries,
      processor: 'base',
      max_results: 3,
      max_chars_per_result: 1000,
    });
    return search.results;
  },
});

async function main() {
  const { text, steps } = await generateText({
    model: 'openai/gpt-4o',
    prompt: 'What was Geoff Hinton\'s last publication?',
    tools: {
      webSearch,
    },
    stopWhen: stepCountIs(5), // run for up to 5 steps
  });

  console.log(text);
  console.dir(steps, { depth: null });
}

main().catch(console.error);
```


