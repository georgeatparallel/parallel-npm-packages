/**
 * Extract tool for Parallel Web
 */

declare const __PACKAGE_VERSION__: string;

import { tool } from 'ai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';
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
   * API key for Parallel Web. If not provided, falls back to PARALLEL_API_KEY
   * environment variable.
   */
  apiKey?: string;

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

  execute: async function (
    { urls, objective }: { urls: string[]; objective?: string },
    { abortSignal }: { abortSignal?: AbortSignal }
  ) {
    return await parallelClient.beta.extract(
      {
        urls,
        objective,
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
    apiKey,
    excerpts,
    full_content,
    fetch_policy,
    description = defaultExtractDescription,
  } = options;

  const client = apiKey
    ? new Parallel({
        apiKey,
        defaultHeaders: {
          'X-Tool-Calling-Package': `npm:@parallel-web/ai-sdk-tools/v${__PACKAGE_VERSION__ ?? '0.0.0'}`,
        },
      })
    : parallelClient;

  return tool({
    description,
    inputSchema: z.object({
      urls: z.array(z.string()).describe(urlsDescription),
      objective: z.string().optional().describe(objectiveDescription),
    }),

    execute: async function (
      { urls, objective }: { urls: string[]; objective?: string },
      { abortSignal }: { abortSignal?: AbortSignal }
    ) {
      return await client.beta.extract(
        {
          urls,
          objective,
          excerpts,
          full_content,
          fetch_policy,
        },
        {
          signal: abortSignal,
        }
      );
    },
  });
}
