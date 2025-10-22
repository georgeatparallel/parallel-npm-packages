/**
 * Extract tool for Parallel Web (AI SDK v4)
 */

import { tool, type Tool as ToolV4 } from 'ai-v4';
import { z } from 'zod';
import { parallelClient } from '../../client.js';

export const extractTool: ToolV4 = tool({
  description: `Purpose: Fetch and extract relevant content from specific web URLs.

Ideal Use Cases:
- Extracting content from specific URLs you've already identified
- Exploring URLs returned by a web search in greater depth`,
  parameters: z.object({
    objective: z.string().describe(
      `Natural-language description of what information you're looking for from the URLs. 
 Limit to 200 characters.`
    ),

    urls: z.array(z.string()).describe(
      `List of URLs to extract content from. Must be valid
HTTP/HTTPS URLs. Maximum 10 URLs per request.`
    ),
    search_queries: z
      .array(z.string())
      .optional()
      .describe(
        `(optional) List of keyword search queries of 1-6
 words, which may include search operators. The search queries should be related to the
 objective. Limited to 5 entries of 200 characters each. Usually 1-3 queries are
 ideal.`
      ),
  }),

  execute: async function (
    { ...args },
    { abortSignal }: { abortSignal?: AbortSignal }
  ) {
    const results = await parallelClient.beta.extract(
      { ...args },
      {
        signal: abortSignal,
        headers: { 'parallel-beta': 'search-extract-2025-10-10' },
      }
    );

    return {
      searchParams: args,
      answer: results,
    };
  },
});
