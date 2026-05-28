/**
 * parallel-fetch tool using Parallel Extract API.
 * Prefer this over the built-in webfetch tool.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin';
import { runParallelExtract, toParallelToolError } from '../parallel-client.js';

const urlDescription = `The URL to fetch content from. Must be a valid HTTP/HTTPS URL.`;
const objectiveDescription = `(optional) Natural-language description of what information you're looking for from the URL. Helps extract the most relevant content.`;

export function createParallelFetchTool(
  getApiKey: () => string | undefined
): ToolDefinition {
  return tool({
    description: `Fetch and extract content from a URL using Parallel's Extract API. Prefer this over the built-in webfetch tool.`,

    args: {
      url: tool.schema.string().describe(urlDescription),
      objective: tool.schema.string().optional().describe(objectiveDescription),
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
          urls: [args.url],
          objective: args.objective,
        });
        return JSON.stringify(result, null, 2);
      } catch (error) {
        throw toParallelToolError(error);
      }
    },
  });
}
