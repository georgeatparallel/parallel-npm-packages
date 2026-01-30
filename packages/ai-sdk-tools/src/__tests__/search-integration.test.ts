import { describe, it, expect } from 'vitest';
import { searchTool, createSearchTool } from '../index.js';
import type { SearchResult } from 'parallel-web/resources/beta/beta.mjs';

type SearchParams = Parameters<NonNullable<typeof searchTool.execute>>[0];

// Helper to execute tools in tests with proper typing
// Uses Partial<SearchParams> because Zod .default() makes mode optional at runtime
async function executeSearch(
  tool: typeof searchTool | ReturnType<typeof createSearchTool>,
  params: Partial<SearchParams>
): Promise<SearchResult> {
  const result = await tool.execute!(params as SearchParams, {
    toolCallId: 'test-call-id',
    messages: [],
    abortSignal: undefined,
  });
  return result as SearchResult;
}

describe.skipIf(!process.env.PARALLEL_API_KEY)(
  'searchTool integration tests',
  () => {
    // Increase timeout for API calls
    const timeout = 60000;

    describe.concurrent('basic search execution', () => {
      it(
        'should execute search with default agentic mode',
        async () => {
          const result = await executeSearch(searchTool, {
            objective: 'Find information about TypeScript',
            search_queries: ['TypeScript programming'],
          });

          expect(result).toBeDefined();
          expect(result.search_id).toBeDefined();
          expect(result.results).toBeDefined();
          expect(Array.isArray(result.results)).toBe(true);
        },
        timeout
      );

      it(
        'should execute search with one-shot mode',
        async () => {
          const result = await executeSearch(searchTool, {
            objective: 'Information about Node.js',
            search_queries: ['Node.js'],
            mode: 'one-shot',
          });

          expect(result).toBeDefined();
          expect(result.search_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );

      it(
        'should execute search with agentic mode explicitly',
        async () => {
          const result = await executeSearch(searchTool, {
            objective: 'React documentation',
            search_queries: ['React hooks'],
            mode: 'agentic',
          });

          expect(result).toBeDefined();
          expect(result.search_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );
    });

    describe.concurrent('search with optional parameters', () => {
      it(
        'should execute search with objective only',
        async () => {
          const result = await executeSearch(searchTool, {
            objective: 'Current weather trends',
          });

          expect(result).toBeDefined();
          expect(result.search_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );

      it(
        'should execute search with objective and search_queries',
        async () => {
          const result = await executeSearch(searchTool, {
            objective: 'AI SDK information',
            search_queries: ['AI SDK', 'Vercel AI'],
          });

          expect(result).toBeDefined();
          expect(result.search_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );
    });

    describe.concurrent('response structure validation', () => {
      it(
        'should return raw API response structure',
        async () => {
          const result = await executeSearch(searchTool, {
            objective: 'Test query',
            search_queries: ['test'],
          });

          // Should return raw API response, not wrapped
          expect(result).toHaveProperty('search_id');
          expect(result).toHaveProperty('results');
          expect(result).not.toHaveProperty('searchParams');
          expect(result).not.toHaveProperty('answer');
        },
        timeout
      );

      it(
        'should have results array with expected properties',
        async () => {
          const result = await executeSearch(searchTool, {
            objective: 'TypeScript programming language',
            search_queries: ['TypeScript'],
          });

          expect(result.results.length).toBeGreaterThan(0);
          const firstResult = result.results[0];
          expect(firstResult).toHaveProperty('url');
          expect(firstResult).toHaveProperty('excerpts');
        },
        timeout
      );
    });

    describe.concurrent('createSearchTool factory', () => {
      it(
        'should create tool with custom defaults',
        async () => {
          const customSearchTool = createSearchTool({
            mode: 'one-shot',
            max_results: 3,
          });

          const result = await executeSearch(customSearchTool, {
            objective: 'JavaScript frameworks',
            search_queries: ['JavaScript framework'],
          });

          expect(result).toBeDefined();
          expect(result.search_id).toBeDefined();
          expect(result.results).toBeDefined();
          // max_results may limit results
          expect(result.results.length).toBeLessThanOrEqual(3);
        },
        timeout
      );
    });
  }
);
