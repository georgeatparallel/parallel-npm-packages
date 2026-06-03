/**
 * Extract tool for Parallel Web (v1 Extract API)
 */

declare const __PACKAGE_VERSION__: string;

import { tool } from 'ai';
import { z } from 'zod';
import { Parallel } from 'parallel-web';
import type {
  AdvancedExtractSettings,
  ExcerptSettings,
  FetchPolicy,
} from 'parallel-web/resources/top-level.mjs';
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
   * Excerpt settings for controlling excerpt length. In the v1 API excerpts are
   * always returned; size is controlled via these settings.
   * Nested under advanced_settings in the v1 API.
   */
  excerpts?: ExcerptSettings;

  /**
   * Include full content from each URL. Set to true to enable with defaults, false
   * to disable, or provide FullContentSettings for fine-grained control.
   * Nested under advanced_settings in the v1 API.
   */
  full_content?: AdvancedExtractSettings['full_content'];

  /**
   * Fetch policy for controlling cached vs fresh content.
   * Nested under advanced_settings in the v1 API.
   */
  fetch_policy?: FetchPolicy | null;

  /**
   * Upper bound on total characters across excerpts from all extracted results.
   * Defaults to a dynamic value based on the request and client_model.
   */
  max_chars_total?: number;

  /**
   * The model consuming the results, e.g. 'claude-opus-4-7'. Enables optimizations
   * tailored to the model's capabilities.
   */
  client_model?: string;

  /**
   * Custom tool description. If not provided, uses the default description.
   */
  description?: string;
}

const urlsDescription = `List of URLs to extract content from. Must be valid HTTP/HTTPS URLs. Maximum 20 URLs per request.`;

const objectiveDescription = `Natural-language description of what information you're looking for from the URLs. Used to focus excerpts on the most relevant content.`;

/**
 * Build an advanced_settings object from code-supplied options, returning
 * undefined when no advanced settings were provided.
 */
function buildAdvancedExtractSettings(
  options: Pick<
    CreateExtractToolOptions,
    'excerpts' | 'full_content' | 'fetch_policy'
  >
): AdvancedExtractSettings | undefined {
  const settings: AdvancedExtractSettings = {};
  if (options.excerpts !== undefined)
    settings.excerpt_settings = options.excerpts;
  if (options.fetch_policy !== undefined)
    settings.fetch_policy = options.fetch_policy;
  if (options.full_content !== undefined)
    settings.full_content = options.full_content;
  return Object.keys(settings).length > 0 ? settings : undefined;
}

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
    objective: z.string().nullable().optional().describe(objectiveDescription),
  }),

  execute: async function ({ urls, objective }, { abortSignal }) {
    return await parallelClient.extract(
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
 * Use this when you want to set defaults for excerpts, full_content,
 * fetch_policy, max_chars_total, or client_model in your code, so the LLM only
 * needs to provide urls and objective.
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
    max_chars_total,
    client_model,
    description = defaultExtractDescription,
  } = options;

  const advanced_settings = buildAdvancedExtractSettings(options);

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
      objective: z
        .string()
        .nullable()
        .optional()
        .describe(objectiveDescription),
    }),

    execute: async function ({ urls, objective }, { abortSignal }) {
      return await client.extract(
        {
          urls,
          objective,
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
