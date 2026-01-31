/**
 * Search tool for Parallel Web
 */

declare const __PACKAGE_VERSION__: string;

import { tool } from 'ai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';
import type {
  ExcerptSettings,
  FetchPolicy,
} from 'parallel-web/resources/beta/beta.mjs';
import type { SourcePolicy } from 'parallel-web/resources/shared.mjs';
import { parallelClient } from '../client.js';

/**
 * Options for creating a custom search tool with code-supplied defaults.
 */
export interface CreateSearchToolOptions {
  /**
   * API key for Parallel Web. If not provided, falls back to PARALLEL_API_KEY
   * environment variable.
   */
  apiKey?: string;

  /**
   * Default mode for search. 'agentic' returns concise, token-efficient results
   * for multi-step workflows. 'one-shot' returns comprehensive results with
   * longer excerpts. Defaults to 'agentic'.
   */
  mode?: 'agentic' | 'one-shot';

  /**
   * Maximum number of search results to return. Defaults to 10.
   */
  max_results?: number;

  /**
   * Excerpt settings for controlling excerpt length.
   */
  excerpts?: ExcerptSettings;

  /**
   * Source policy for controlling which domains to include/exclude and freshness.
   */
  source_policy?: SourcePolicy | null;

  /**
   * Fetch policy for controlling cached vs fresh content.
   */
  fetch_policy?: FetchPolicy | null;

  /**
   * Custom tool description. If not provided, uses the default description.
   */
  description?: string;
}

const objectiveDescription = `Natural-language description of what the web search is trying to find.
Try to make the search objective atomic, looking for a specific piece of information. May include guidance about preferred sources or freshness.`;

const searchQueriesDescription = `(optional) List of keyword search queries of 1-6 words, which may include search operators. The search queries should be related to the objective. Limited to 5 entries of 200 characters each.`;

const modeDescription = `Presets default values for different use cases. "one-shot" returns more comprehensive results and longer excerpts to answer questions from a single response, while "agentic" returns more concise, token-efficient results for use in an agentic loop. Defaults to "agentic".`;

/**
 * Search tool that mirrors the MCP web_search_preview tool.
 * Takes objective and optional search_queries/mode, returns raw search response.
 */
export const searchTool = tool({
  description: `Purpose: Perform web searches and return results in an LLM-friendly format.

Use the web search tool to search the web and access information from the web. The tool returns ranked, extended web excerpts optimized for LLMs.`,
  inputSchema: z.object({
    objective: z.string().describe(objectiveDescription),
    search_queries: z
      .array(z.string())
      .optional()
      .describe(searchQueriesDescription),
    mode: z
      .enum(['agentic', 'one-shot'])
      .optional()
      .default('agentic')
      .describe(modeDescription),
  }),

  execute: async function (
    { objective, search_queries, mode },
    { abortSignal }
  ) {
    return await parallelClient.beta.search(
      {
        objective,
        search_queries,
        mode,
      },
      {
        signal: abortSignal,
      }
    );
  },
});

const defaultSearchDescription = `Purpose: Perform web searches and return results in an LLM-friendly format.

Use the web search tool to search the web and access information from the web. The tool returns ranked, extended web excerpts optimized for LLMs.`;

/**
 * Factory function to create a search tool with custom defaults.
 *
 * Use this when you want to set defaults for mode, max_results, excerpts,
 * source_policy, or fetch_policy in your code, so the LLM only needs to
 * provide objective and search_queries.
 *
 * @example
 * ```ts
 * const mySearchTool = createSearchTool({
 *   mode: 'one-shot',
 *   max_results: 5,
 *   excerpts: { max_chars_per_result: 5000 },
 * });
 * ```
 */
export function createSearchTool(options: CreateSearchToolOptions = {}) {
  const {
    apiKey,
    mode: defaultMode = 'agentic',
    max_results,
    excerpts,
    source_policy,
    fetch_policy,
    description = defaultSearchDescription,
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
      objective: z.string().describe(objectiveDescription),
      search_queries: z
        .array(z.string())
        .optional()
        .describe(searchQueriesDescription),
    }),

    execute: async function ({ objective, search_queries }, { abortSignal }) {
      return await client.beta.search(
        {
          objective,
          search_queries,
          mode: defaultMode,
          max_results,
          excerpts,
          source_policy,
          fetch_policy,
        },
        {
          signal: abortSignal,
        }
      );
    },
  });
}
