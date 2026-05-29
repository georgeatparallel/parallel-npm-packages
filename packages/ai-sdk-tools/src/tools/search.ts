/**
 * Search tool for Parallel Web (v1 Search API)
 */

declare const __PACKAGE_VERSION__: string;

import { tool } from 'ai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';
import type {
  AdvancedSearchSettings,
  ExcerptSettings,
  FetchPolicy,
} from 'parallel-web/resources/top-level.mjs';
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
   * Default search mode. 'basic' offers the lowest latency and works best with
   * 2-3 high-quality search queries. 'advanced' provides higher quality with more
   * advanced retrieval and compression. Defaults to 'advanced'.
   */
  mode?: 'basic' | 'advanced';

  /**
   * Upper bound on total characters across excerpts from all results. Defaults to
   * a dynamic value based on the request and client_model.
   */
  max_chars_total?: number;

  /**
   * The model consuming the results, e.g. 'claude-opus-4-7'. Enables optimizations
   * tailored to the model's capabilities.
   */
  client_model?: string;

  /**
   * Maximum number of search results to return. Defaults to 10.
   * Nested under advanced_settings in the v1 API.
   */
  max_results?: number;

  /**
   * Excerpt settings for controlling excerpt length.
   * Nested under advanced_settings in the v1 API.
   */
  excerpts?: ExcerptSettings;

  /**
   * ISO 3166-1 alpha-2 country code for geo-targeted search results.
   * Nested under advanced_settings in the v1 API.
   */
  location?: string;

  /**
   * Source policy for controlling which domains to include/exclude and freshness.
   * Nested under advanced_settings in the v1 API.
   */
  source_policy?: SourcePolicy | null;

  /**
   * Fetch policy for controlling cached vs fresh content.
   * Nested under advanced_settings in the v1 API.
   */
  fetch_policy?: FetchPolicy | null;

  /**
   * Custom tool description. If not provided, uses the default description.
   */
  description?: string;
}

const objectiveDescription = `Natural-language description of the underlying question or goal driving the search. Used together with search_queries to focus results on the most relevant content. Should be self-contained with enough context to understand the intent of the search.`;

const searchQueriesDescription = `List of concise keyword search queries, 3-6 words each, which may include search operators. At least one query is required; provide 2-3 for best results. Limited to 5 entries of 200 characters each.`;

const modeDescription = `Search mode preset. "basic" offers the lowest latency and works best with 2-3 high-quality search queries, while "advanced" provides higher quality with more advanced retrieval and compression. Defaults to "advanced".`;

/**
 * Build an advanced_settings object from code-supplied options, returning
 * undefined when no advanced settings were provided.
 */
function buildAdvancedSearchSettings(
  options: Pick<
    CreateSearchToolOptions,
    'max_results' | 'excerpts' | 'location' | 'source_policy' | 'fetch_policy'
  >
): AdvancedSearchSettings | undefined {
  const settings: AdvancedSearchSettings = {};
  if (options.excerpts !== undefined)
    settings.excerpt_settings = options.excerpts;
  if (options.fetch_policy !== undefined)
    settings.fetch_policy = options.fetch_policy;
  if (options.location !== undefined) settings.location = options.location;
  if (options.max_results !== undefined)
    settings.max_results = options.max_results;
  if (options.source_policy !== undefined)
    settings.source_policy = options.source_policy;
  return Object.keys(settings).length > 0 ? settings : undefined;
}

/**
 * Search tool that mirrors the MCP web_search_preview tool.
 * Takes search_queries plus optional objective/mode, returns raw search response.
 */
export const searchTool = tool({
  description: `Purpose: Perform web searches and return results in an LLM-friendly format.

Use the web search tool to search the web and access information from the web. The tool returns ranked, extended web excerpts optimized for LLMs.`,
  inputSchema: z.object({
    search_queries: z
      .array(z.string())
      .min(1)
      .describe(searchQueriesDescription),
    objective: z.string().nullable().optional().describe(objectiveDescription),
    mode: z
      .enum(['basic', 'advanced'])
      .nullable()
      .optional()
      .default('advanced')
      .describe(modeDescription),
  }),

  execute: async function (
    { search_queries, objective, mode },
    { abortSignal }
  ) {
    return await parallelClient.search(
      {
        search_queries,
        objective,
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
 * Use this when you want to set defaults for mode, max_chars_total, client_model,
 * or advanced settings (max_results, excerpts, location, source_policy,
 * fetch_policy) in your code, so the LLM only needs to provide search_queries and
 * objective.
 *
 * @example
 * ```ts
 * const mySearchTool = createSearchTool({
 *   mode: 'basic',
 *   max_results: 5,
 *   excerpts: { max_chars_per_result: 5000 },
 * });
 * ```
 */
export function createSearchTool(options: CreateSearchToolOptions = {}) {
  const {
    apiKey,
    mode: defaultMode = 'advanced',
    max_chars_total,
    client_model,
    description = defaultSearchDescription,
  } = options;

  const advanced_settings = buildAdvancedSearchSettings(options);

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
      search_queries: z
        .array(z.string())
        .min(1)
        .describe(searchQueriesDescription),
      objective: z
        .string()
        .nullable()
        .optional()
        .describe(objectiveDescription),
    }),

    execute: async function ({ search_queries, objective }, { abortSignal }) {
      return await client.search(
        {
          search_queries,
          objective,
          mode: defaultMode,
          max_chars_total,
          client_model,
          advanced_settings,
        },
        {
          signal: abortSignal,
        }
      );
    },
  });
}
