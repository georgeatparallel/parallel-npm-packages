/**
 * Extract tool for Parallel Web
 */

import { tool } from 'ai';
import { z } from 'zod';
import type {
  ExcerptSettings,
  FetchPolicy,
  BetaExtractParams,
} from 'parallel-web/resources/beta/beta.mjs';
import { parallelClient } from '../client.js';

/**
 * Options for creating a custom extract tool with code-supplied defaults.
 */
export interface CreateExtractToolOptions {
  /**
   * Include excerpts from each URL relevant to the search objective and queries.
   * Can be a boolean or ExcerptSettings object. Defaults to true.
   */
  excerpts?: boolean | ExcerptSettings;

  /**
   * Include full content from each URL. Can be a boolean or FullContentSettings object.
   * Defaults to false.
   */
  full_content?: BetaExtractParams['full_content'];

  /**
   * Fetch policy for controlling cached vs fresh content.
   */
  fetch_policy?: FetchPolicy | null;

  /**
   * Custom tool description. If not provided, uses the default description.
   */
  description?: string;
}

const urlsDescription = `List of URLs to extract content from. Must be valid HTTP/HTTPS URLs. Maximum 10 URLs per request.`;

const objectiveDescription = `Natural-language description of what information you're looking for from the URLs.`;

/**
 * Extract tool that mirrors the MCP web_fetch tool.
 * Takes urls and optional objective, returns raw extract response.
 */
export const extractTool = tool({
  description: `Purpose: Fetch and extract relevant content from specific web URLs.

Ideal Use Cases:
- Extracting content from specific URLs you've already identified
- Exploring URLs returned by a web search in greater depth`,
  inputSchema: z.object({
    urls: z.array(z.string()).describe(urlsDescription),
    objective: z.string().optional().describe(objectiveDescription),
  }),

  execute: async function ({ urls, objective }, { abortSignal }) {
    return await parallelClient.beta.extract(
      {
        urls,
        objective,
        betas: ['search-extract-2025-10-10'],
      },
      {
        signal: abortSignal,
      }
    );
  },
});

const defaultExtractDescription = `Purpose: Fetch and extract relevant content from specific web URLs.

Ideal Use Cases:
- Extracting content from specific URLs you've already identified
- Exploring URLs returned by a web search in greater depth`;

/**
 * Factory function to create an extract tool with custom defaults.
 *
 * Use this when you want to set defaults for excerpts, full_content, or
 * fetch_policy in your code, so the LLM only needs to provide urls and objective.
 *
 * @example
 * ```ts
 * const myExtractTool = createExtractTool({
 *   excerpts: { max_chars_per_result: 5000 },
 *   full_content: true,
 * });
 * ```
 */
export function createExtractTool(options: CreateExtractToolOptions = {}) {
  const {
    excerpts,
    full_content,
    fetch_policy,
    description = defaultExtractDescription,
  } = options;

  return tool({
    description,
    inputSchema: z.object({
      urls: z.array(z.string()).describe(urlsDescription),
      objective: z.string().optional().describe(objectiveDescription),
    }),

    execute: async function ({ urls, objective }, { abortSignal }) {
      return await parallelClient.beta.extract(
        {
          urls,
          objective,
          excerpts,
          full_content,
          fetch_policy,
          betas: ['search-extract-2025-10-10'],
        },
        {
          signal: abortSignal,
        }
      );
    },
  });
}
