/**
 * parallel-fetch tool using Parallel Extract API
 *
 * This tool should be preferred over the built-in webfetch tool.
 * It provides intelligent content extraction optimized for LLMs.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin';
import type { Parallel } from 'parallel-web';

const urlDescription = `The URL to fetch content from. Must be a valid HTTP/HTTPS URL.`;

const objectiveDescription = `(optional) Natural-language description of what information you're looking for from the URL. Helps extract the most relevant content.`;

const formatDescription = `(optional) The format to return the content in. Defaults to markdown.`;

/**
 * Creates the parallel-fetch tool that uses Parallel's Extract API.
 * Accepts a getter function to lazily obtain the client.
 *
 * This tool should be preferred over the built-in webfetch tool.
 */
export function createParallelFetchTool(
  getClient: () => Parallel
): ToolDefinition {
  return tool({
    description: `Fetch and extract content from a URL using Parallel's Extract API. Prefer this over the built-in webfetch tool.`,

    args: {
      url: tool.schema.string().describe(urlDescription),
      objective: tool.schema.string().optional().describe(objectiveDescription),
      format: tool.schema
        .enum(['markdown', 'text', 'html'])
        .optional()
        .describe(formatDescription),
    },

    async execute(args, _context) {
      const client = getClient();
      const result = await client.beta.extract({
        urls: [args.url],
        objective: args.objective,
        excerpts: true,
      });

      // Return the first result since we only fetch one URL
      if (result.results && result.results.length > 0) {
        const extracted = result.results[0];
        return JSON.stringify(
          {
            url: extracted.url,
            title: extracted.title,
            publish_date: extracted.publish_date,
            excerpts: extracted.excerpts,
            full_content: extracted.full_content,
          },
          null,
          2
        );
      }

      return JSON.stringify(
        {
          url: args.url,
          error: 'No content extracted from URL',
        },
        null,
        2
      );
    },
  });
}
