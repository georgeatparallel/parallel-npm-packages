# @parallel-web/ai-sdk-tools

AI SDK tools for Parallel Web with support for both AI SDK v4 and v5.

## Installation

```bash
npm install @parallel-web/ai-sdk-tools ai
# or
pnpm add @parallel-web/ai-sdk-tools ai
# or
yarn add @parallel-web/ai-sdk-tools ai
```

**Note:** This package includes both AI SDK v4 and v5 support via package aliases.

## Version Compatibility

**This package supports both AI SDK v4 and v5!** 

Using npm package aliases, we bundle both `ai@4.x` and `ai@5.x` within the same package, providing genuine compatibility for both versions.

### Choose Your Version

- **AI SDK v5 (Default/Recommended)**
  ```typescript
  import { searchTool, extractTool } from '@parallel-web/ai-sdk-tools';
  // or explicitly
  import { searchTool, extractTool } from '@parallel-web/ai-sdk-tools/v5';
  ```

- **AI SDK v4**
  ```typescript
  import { searchTool, extractTool } from '@parallel-web/ai-sdk-tools/v4';
  ```

### How It Works

The package uses npm package aliases to install both versions:
- `ai-v4`: Maps to `ai@^4.0.0` (uses `parameters` API)
- `ai-v5`: Maps to `ai@^5.0.0` (uses `inputSchema` API)

Each version has its own implementation that imports from the appropriate aliased package, ensuring **100% real compatibility** with both SDK versions.

## Usage

Add `PARALLEL_API_KEY` obtained from [Parallel Platform](https://platform.parallel.ai/settings?tab=api-keys) to your environment variables.

### Search Tool

`searchTool` uses [Parallel's web search API](https://docs.parallel.ai/api-reference/search-api/search) to get fresh relevant search results.

### With AI SDK v5 (Recommended)

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

### With AI SDK v4

```typescript
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { searchTool } from '@parallel-web/ai-sdk-tools/v4';

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

### Custom Tools

You can create custom tools that wrap the Parallel Web API:

**For AI SDK v5:**
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
  inputSchema: z.object({  // v5 uses inputSchema
    searchQueries: z.array(z.string()).describe("Search queries"),
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

**For AI SDK v4:**
```typescript
import { tool } from 'ai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';

const parallel = new Parallel({
  apiKey: process.env.PARALLEL_API_KEY,
});

const webSearch = tool({
  description: 'Use this tool to search the web.',
  parameters: z.object({  // v4 uses parameters
    searchQueries: z.array(z.string()).describe("Search queries"),
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


