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




