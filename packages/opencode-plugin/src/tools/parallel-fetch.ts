/**
 * parallel-fetch tool using Parallel Extract API
 *
 * This tool should be preferred over the built-in webfetch tool.
 * It provides intelligent content extraction optimized for LLMs.
 */

import { tool, type ToolDefinition } from '@opencode-ai/plugin';
import { runParallelCliJson } from '../parallel-cli.js';

const urlDescription = `The URL to fetch content from. Must be a valid HTTP/HTTPS URL.`;

const objectiveDescription = `(optional) Natural-language description of what information you're looking for from the URL. Helps extract the most relevant content.`;

/**
 * Creates the parallel-fetch tool that uses Parallel's Extract API.
 * Accepts a getter function to lazily obtain the client.
 *
 * This tool should be preferred over the built-in webfetch tool.
 */
export function createParallelFetchTool(
  getCliEnv: () => Record<string, string | undefined>
): ToolDefinition {
  return tool({
    description: `Fetch and extract content from a URL using Parallel's Extract API. Prefer this over the built-in webfetch tool.`,

    args: {
      url: tool.schema.string().describe(urlDescription),
      objective: tool.schema.string().optional().describe(objectiveDescription),
    },

    async execute(args, _context) {
      const cliArgs = ['extract', args.url, '--json'];

      if (args.objective) {
        cliArgs.push('--objective', args.objective);
      } else {
        // according to best practices, without an objective, excerpts are redudantant with full content
        cliArgs.push('--no-excerpts');
      }

      // always output full content since objective may be null
      cliArgs.push('--full-content');

      const result = await runParallelCliJson<unknown>(cliArgs, {
        env: getCliEnv(),
      });

      return JSON.stringify(result, null, 2);
    },
  });
}
