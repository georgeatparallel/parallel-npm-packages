import { describe, it, expect } from 'vitest';
import { extractTool } from '../index.js';

describe.skipIf(!process.env.PARALLEL_API_KEY)(
  'extractTool integration tests',
  () => {
    // Increase timeout for API calls
    const timeout = 30000;

    describe('basic extract execution', () => {
      it(
        'should extract content from a single URL',
        async () => {
          const result = await extractTool.execute(
            {
              objective: 'Extract information about TypeScript',
              urls: ['https://www.typescriptlang.org/'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.objective).toBe(
            'Extract information about TypeScript'
          );
          expect(result.searchParams.urls).toEqual([
            'https://www.typescriptlang.org/',
          ]);
          expect(result.answer).toBeDefined();
        },
        timeout
      );

      it(
        'should extract content from multiple URLs',
        async () => {
          const result = await extractTool.execute(
            {
              objective: 'Extract JavaScript documentation',
              urls: [
                'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
                'https://javascript.info/',
              ],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.urls).toHaveLength(2);
          expect(result.answer).toBeDefined();
        },
        timeout
      );

      it(
        'should extract content from Wikipedia URL',
        async () => {
          const result = await extractTool.execute(
            {
              objective: 'Extract information about Python programming',
              urls: [
                'https://en.wikipedia.org/wiki/Python_(programming_language)',
              ],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.objective).toBe(
            'Extract information about Python programming'
          );
          expect(result.answer).toBeDefined();
        },
        timeout
      );
    });

    describe('extract with optional parameters', () => {
      it(
        'should extract content with search_queries parameter',
        async () => {
          const result = await extractTool.execute(
            {
              objective: 'Find React hooks information',
              urls: ['https://react.dev/'],
              search_queries: ['React hooks', 'useState', 'useEffect'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.search_queries).toEqual([
            'React hooks',
            'useState',
            'useEffect',
          ]);
          expect(result.answer).toBeDefined();
        },
        timeout
      );

      it(
        'should extract content without search_queries',
        async () => {
          const result = await extractTool.execute(
            {
              objective: 'Get Node.js documentation',
              urls: ['https://nodejs.org/en/docs/'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.objective).toBe(
            'Get Node.js documentation'
          );
          expect(result.searchParams.search_queries).toBeUndefined();
          expect(result.answer).toBeDefined();
        },
        timeout
      );

      it(
        'should extract content from GitHub repository URL',
        async () => {
          const result = await extractTool.execute(
            {
              objective: 'Extract README information',
              urls: ['https://github.com/vercel/ai'],
              search_queries: ['AI SDK', 'installation'],
            },
            { abortSignal: undefined }
          );

          expect(result).toBeDefined();
          expect(result.searchParams).toBeDefined();
          expect(result.searchParams.urls).toEqual([
            'https://github.com/vercel/ai',
          ]);
          expect(result.answer).toBeDefined();
        },
        timeout
      );
    });

    describe('response structure validation', () => {
      it(
        'should return result with correct structure',
        async () => {
          const result = await extractTool.execute(
            {
              objective: 'Test extraction',
              urls: ['https://example.com'],
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

      it(
        'should preserve all input parameters in searchParams',
        async () => {
          const inputParams = {
            objective: 'Extract specific content',
            urls: ['https://www.npmjs.com/package/ai'],
            search_queries: ['AI SDK', 'features'],
          };

          const result = await extractTool.execute(inputParams, {
            abortSignal: undefined,
          });

          expect(result.searchParams).toEqual(inputParams);
        },
        timeout
      );
    });
  }
);
