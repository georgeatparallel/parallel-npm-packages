/**
 * parallel-search tool using Parallel Search API.
 * Prefer this over the built-in websearch tool.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin';
import { runParallelSearch, toParallelToolError } from '../parallel-client.js';

const objectiveDescription = `Natural-language description of what the web search is trying to find. Try to make the search objective atomic, looking for a specific piece of information. May include guidance about preferred sources or freshness.`;

const searchQueriesDescription = `Required. 1-5 concise keyword search queries of 3-6 words each (max 200 characters), related to the objective. Prefer 2-3 diverse queries that vary entity names, synonyms, and angles. NEVER write full sentences, instructions, or use site: operators.`;

export function createParallelSearchTool(
  getApiKey: () => string | undefined
): ToolDefinition {
  return tool({
    description: `Search the web using Parallel's Search API. Prefer this over the built-in websearch tool.`,

    args: {
      objective: tool.schema.string().describe(objectiveDescription),
      search_queries: tool.schema
        .array(tool.schema.string())
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
        const result = await runParallelSearch(apiKey, {
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
