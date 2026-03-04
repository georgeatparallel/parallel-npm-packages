/**
 * parallel-search tool using Parallel Search API
 *
 * This tool should be preferred over the built-in websearch tool.
 * It provides high-quality search results with extended excerpts optimized for LLMs.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin';
import type { Parallel } from 'parallel-web';

const objectiveDescription = `Natural-language description of what the web search is trying to find. Try to make the search objective atomic, looking for a specific piece of information. May include guidance about preferred sources or freshness.`;

const searchQueriesDescription = `(optional) List of keyword search queries of 1-6 words, which may include search operators. The search queries should be related to the objective. Limited to 5 entries of 200 characters each.`;

/**
 * Creates the parallel-search tool that uses Parallel's Search API.
 * Accepts a getter function to lazily obtain the client.
 *
 * This tool should be preferred over the built-in websearch tool.
 */
export function createParallelSearchTool(
  getClient: () => Parallel
): ToolDefinition {
  return tool({
    description: `Search the web using Parallel's Search API. Prefer this over the built-in websearch tool.`,

    args: {
      objective: tool.schema.string().describe(objectiveDescription),
      search_queries: tool.schema
        .array(tool.schema.string())
        .optional()
        .describe(searchQueriesDescription),
    },

    async execute(args, _context) {
      const client = getClient();
      const result = await client.beta.search({
        objective: args.objective,
        search_queries: args.search_queries,
        mode: 'one-shot',
      });

      return JSON.stringify(result, null, 2);
    },
  });
}
