/**
 * Search tool for Parallel Web
 */

import { tool } from 'ai';
import { z } from 'zod';
import { BetaSearchParams } from 'parallel-web/resources/beta/beta.mjs';
import { parallelClient } from '../client.js';

const search = async (
  searchArgs: BetaSearchParams,
  { abortSignal }: { abortSignal: AbortSignal | undefined }
) => {
  return await parallelClient.beta.search(
    {
      ...searchArgs,
    },
    {
      signal: abortSignal,
    }
  );
};

export const searchTool = tool({
  description:
    'Search Tool to quickly search in websites and published/public information on the internet like news, articles, blogs, posts, products, services, etc.',
  parameters: z.object({
    objective: z
      .string()
      .describe(
        'Natural-language description of what the web search is trying to find. May include guidance about preferred sources or freshness. At least one of objective or search_queries must be provided.'
      ),
    search_queries: z
      .array(z.string())
      .optional()
      .describe(
        'Optional list of traditional keyword search queries to guide the search. May contain search operators. At least one of objective or search_queries must be provided.'
      ),
    processor: z
      .enum(['pro', 'base'])
      .optional()
      .describe(
        'The processor to use for the search. `pro` is recommended for complex queries, or incomplete objectives. `base` is recommended for simple queries.'
      ),
    max_results: z
      .number()
      .optional()
      .describe(
        'The maximum number of results to return. Default is 10. Optional value, do not pass if not needed.'
      ),
    source_policy: z
      .object({
        include_domains: z
          .array(z.string())
          .optional()
          .describe('The sources to include in the search. Optional value.'),
        exclude_domains: z
          .array(z.string())
          .optional()
          .describe('The sources to exclude in the search. Optional value.'),
      })
      .optional()
      .describe('The policy to use for the search. Optional value.'),
  }),

  execute: async function ({ ...args }, { abortSignal }) {
    const results = await search(args, { abortSignal });

    return {
      searchParams: args,
      answer: results,
    };
  },
});
