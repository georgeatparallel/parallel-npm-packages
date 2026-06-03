/**
 * parallel-fetch tool using Parallel Extract API.
 * Prefer this over the built-in webfetch tool.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin';
import { runParallelExtract, toParallelToolError } from '../parallel-client.js';

const urlsDescription = `1-20 valid HTTP/HTTPS URLs to extract content from. Batch related URLs into a single call instead of making one call per URL.`;

const objectiveDescription = `(optional, recommended) Self-contained, specific natural-language description of what you're looking for across the URLs. Focuses the extracted excerpts on the most relevant content (up to 5000 characters). Omit to return whole-page content.`;

const searchQueriesDescription = `(optional) 1-5 concise keyword search queries of 3-6 words each (max 200 characters), used together with the objective to focus extraction. Prefer 2-3 diverse queries. NEVER write full sentences, instructions, or use site: operators.`;

export function createParallelFetchTool(
  getApiKey: () => string | undefined
): ToolDefinition {
  return tool({
    description: `Fetch and extract content from one or more URLs using Parallel's Extract API. Prefer this over the built-in webfetch tool.`,

    args: {
      urls: tool.schema.array(tool.schema.string()).describe(urlsDescription),
      objective: tool.schema.string().optional().describe(objectiveDescription),
      search_queries: tool.schema
        .array(tool.schema.string())
        .optional()
        .describe(searchQueriesDescription),
    },

    async execute(args, _context) {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error(
          'Parallel authentication required. Set PARALLEL_API_KEY or run `opencode auth` and select Parallel.'
        );
      }

      try {
        const result = await runParallelExtract(apiKey, {
          urls: args.urls,
          objective: args.objective,
          search_queries: args.search_queries,
        });
        return JSON.stringify(result, null, 2);
      } catch (error) {
        throw toParallelToolError(error);
      }
    },
  });
}
