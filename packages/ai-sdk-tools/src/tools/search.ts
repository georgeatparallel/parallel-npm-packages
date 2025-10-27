/**
 * Search tool for Parallel Web
 */

import { tool } from 'ai';
import { z } from 'zod';
import { BetaSearchParams } from 'parallel-web/resources/beta/beta.mjs';
import { parallelClient } from '../client.js';

function getSearchParams(
  search_type: 'list' | 'targeted' | 'general' | 'single_page'
): Pick<BetaSearchParams, 'max_results' | 'max_chars_per_result'> {
  switch (search_type) {
    case 'targeted':
      return { max_results: 5, max_chars_per_result: 16000 };
    case 'general':
      return { max_results: 10, max_chars_per_result: 9000 };
    case 'single_page':
      return { max_results: 2, max_chars_per_result: 30000 };
    case 'list':
    default:
      return { max_results: 20, max_chars_per_result: 1500 };
  }
}

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
  description: `Use the web_search_parallel tool to access information from the web. The
web_search_parallel tool returns ranked, extended web excerpts optimized for LLMs.
Intelligently scale the number of web_search_parallel tool calls to get more information
when needed, from a single call for simple factual questions to five or more calls for
complex research questions.

* Keep queries concise - 1-6 words for best results. Start broad with very short
  queries and medium context, then add words to narrow results or use high context
  if needed.
* Include broader context about what the search is trying to accomplish in the
  \`objective\` field. This helps the search engine understand the user's intent and
  provide relevant results and excerpts.
* Never repeat similar search queries - make every query unique. If initial results are
  insufficient, reformulate queries to obtain new and better results.

How to use:
- For simple queries, a one-shot call to depth is usually sufficient.
- For complex multi-hop queries, first try to use breadth to narrow down sources. Then
use other search types with include_domains to get more detailed results.`,
  inputSchema: z.object({
    objective: z.string().describe(
      `Natural-language description of what the web research goal
 is. Specify the broad intent of the search query here. Also include any source or
 freshness guidance here. Limit to 200 characters. This should reflect the end goal so
 that the tool can better understand the intent and return the best results. Do not
 dump long texts.`
    ),
    search_type: z
      .enum(['list', 'general', 'single_page', 'targeted'])
      .describe(
        `Can be "list", "general", "single_page" or "targeted".
 "list" should be used for searching for data broadly, like aggregating data or
 considering multiple sources or doing broad initial research. "targeted" should be
 used for searching for data from a specific source set. "general" is a catch all case
 if there is no specific use case from list or targeted. "single_page" extracts data
 from a single page - extremely targeted. If there is a specific webpage you want the
 data from, use "single_page" and mention the URL in the objective.
 Use search_type appropriately.`
      )
      .optional()
      .default('list'),
    search_queries: z
      .array(z.string())
      .optional()
      .describe(
        `(optional) List of keyword search queries of 1-6
 words, which may include search operators. The search queries should be related to the
 objective. Limited to 5 entries of 200 characters each. Usually 1-3 queries are
 ideal.`
      ),
    include_domains: z.array(z.string()).optional()
      .describe(`(optional) List of valid URL domains to explicitly
 focus on for the search. This will restrict all search results to only include results
 from the provided list. This is useful when you want to only use a specific set of
 sources. example: ["google.com", "wikipedia.org"]. Maximum 10 entries.`),
  }),

  execute: async function ({ ...args }, { abortSignal }) {
    const results = await search(
      { ...args, ...getSearchParams(args.search_type) },
      { abortSignal }
    );

    return {
      searchParams: args,
      answer: results,
    };
  },
});
