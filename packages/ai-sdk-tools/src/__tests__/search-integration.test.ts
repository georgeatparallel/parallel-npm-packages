import { describe, it, expect } from 'vitest';
import { searchTool } from '../index.js';

describe.skipIf(!process.env.PARALLEL_API_KEY)(
  'searchTool integration tests',
  () => {
    // Increase timeout for API calls
    const timeout = 30000;

    describe('basic search execution', () => {
      it(
        'should execute search with list search_type',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Find information about TypeScript',
              search_type: 'list',
              search_queries: ['TypeScript programming'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.objective).toBe(
            'Find information about TypeScript'
          );
          expect(result.searchParams.search_type).toBe('list');
          expect(result.answer).toBeDefined();
        },
        timeout
      );

      it(
        'should execute search with general search_type',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Information about Node.js',
              search_type: 'general',
              search_queries: ['Node.js'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.search_type).toBe('general');
          expect(result.answer).toBeDefined();
        },
        timeout
      );

      it(
        'should execute search with targeted search_type',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'React documentation',
              search_type: 'targeted',
              search_queries: ['React hooks'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.search_type).toBe('targeted');
          expect(result.answer).toBeDefined();
        },
        timeout
      );

      it(
        'should execute search with single_page search_type',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Get content from Wikipedia Python page',
              search_type: 'single_page',
              search_queries: ['Python programming Wikipedia'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.search_type).toBe('single_page');
          expect(result.answer).toBeDefined();
        },
        timeout
      );
    });

    describe('search with optional parameters', () => {
      it(
        'should execute search with include_domains parameter',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Find JavaScript tutorials',
              search_type: 'list',
              search_queries: ['JavaScript tutorial'],
              include_domains: ['developer.mozilla.org', 'javascript.info'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.include_domains).toEqual([
            'developer.mozilla.org',
            'javascript.info',
          ]);
          expect(result.answer).toBeDefined();
        },
        timeout
      );

      it(
        'should execute search with only objective and search_queries',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'AI SDK information',
              search_queries: ['AI SDK', 'Vercel AI'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.objective).toBe('AI SDK information');
          expect(result.searchParams.search_queries).toEqual([
            'AI SDK',
            'Vercel AI',
          ]);
          expect(result.answer).toBeDefined();
        },
        timeout
      );

      it(
        'should execute search without search_queries',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Current weather trends',
              search_type: 'general',
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.objective).toBe('Current weather trends');
          expect(result.answer).toBeDefined();
        },
        timeout
      );
    });

    describe('response structure validation', () => {
      it(
        'should return result with correct structure',
        async () => {
          const result = await searchTool.execute(
            {
              objective: 'Test query',
              search_type: 'list',
              search_queries: ['test'],
            },
            { abortSignal: undefined }
          );

          expect(result).toHaveProperty('searchParams');
          expect(result).toHaveProperty('answer');
          expect(typeof result.searchParams).toBe('object');
          expect(typeof result.answer).toBe('object');
        },
        timeout
      );
    });
  }
);
