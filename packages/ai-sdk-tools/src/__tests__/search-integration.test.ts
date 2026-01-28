import { describe, it, expect } from 'vitest';
import { searchTool, createSearchTool } from '../index.js';

describe.skipIf(!process.env.PARALLEL_API_KEY)(
  'searchTool integration tests',
  () => {
    // Increase timeout for API calls
    const timeout = 30000;

    describe('basic search execution', () => {
      it(
        'should execute search with default agentic mode',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Find information about TypeScript',
              search_queries: ['TypeScript programming'],
            },
            { abortSignal: undefined }
          );

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
          const result = await searchTool.execute(
            {
              objective: 'Information about Node.js',
              search_queries: ['Node.js'],
              mode: 'one-shot',
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.search_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );

      it(
        'should execute search with agentic mode explicitly',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'React documentation',
              search_queries: ['React hooks'],
              mode: 'agentic',
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.search_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );
    });

    describe('search with optional parameters', () => {
      it(
        'should execute search with objective only',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Current weather trends',
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.search_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );

      it(
        'should execute search with objective and search_queries',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'AI SDK information',
              search_queries: ['AI SDK', 'Vercel AI'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.search_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );
    });

    describe('response structure validation', () => {
      it(
        'should return raw API response structure',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Test query',
              search_queries: ['test'],
            },
            { abortSignal: undefined }
          );

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
          const result = await searchTool.execute(
            {
              objective: 'TypeScript programming language',
              search_queries: ['TypeScript'],
            },
            { abortSignal: undefined }
          );

          expect(result.results.length).toBeGreaterThan(0);
          const firstResult = result.results[0];
          expect(firstResult).toHaveProperty('url');
          expect(firstResult).toHaveProperty('excerpts');
        },
        timeout
      );
    });

    describe('createSearchTool factory', () => {
      it(
        'should create tool with custom defaults',
        async () => {
          const customSearchTool = createSearchTool({
            mode: 'one-shot',
            max_results: 3,
          });

          const result = await customSearchTool.execute(
            {
              objective: 'JavaScript frameworks',
              search_queries: ['JavaScript framework'],
            },
            { abortSignal: undefined }
          );

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
