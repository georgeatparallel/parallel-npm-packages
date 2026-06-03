import { describe, it, expect } from 'vitest';
import { extractTool, createExtractTool } from '../index.js';
import type { ExtractResponse } from 'parallel-web/resources/top-level.mjs';

// Helper to execute tools in tests with proper typing
async function executeExtract(
  tool: typeof extractTool,
  params: Parameters<NonNullable<typeof extractTool.execute>>[0]
): Promise<ExtractResponse> {
  const result = await tool.execute!(params, {
    toolCallId: 'test-call-id',
    messages: [],
    abortSignal: undefined,
  });
  return result as ExtractResponse;
}

describe.skipIf(!process.env.PARALLEL_API_KEY)(
  'extractTool integration tests',
  () => {
    // Increase timeout for API calls
    const timeout = 60000;

    describe.concurrent('basic extract execution', () => {
      it(
        'should extract content from a single URL',
        async () => {
          const result = await executeExtract(extractTool, {
            urls: ['https://www.typescriptlang.org/'],
            objective: 'Extract information about TypeScript',
          });

          expect(result).toBeDefined();
          expect(result.extract_id).toBeDefined();
          expect(result.results).toBeDefined();
          expect(Array.isArray(result.results)).toBe(true);
        },
        timeout
      );

      it(
        'should extract content from multiple URLs',
        async () => {
          const result = await executeExtract(extractTool, {
            urls: [
              'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
              'https://javascript.info/',
            ],
            objective: 'Extract JavaScript documentation',
          });

          expect(result).toBeDefined();
          expect(result.extract_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );

      it(
        'should extract content without objective',
        async () => {
          const result = await executeExtract(extractTool, {
            urls: ['https://example.com'],
          });

          expect(result).toBeDefined();
          expect(result.extract_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );
    });

    describe.concurrent('response structure validation', () => {
      it(
        'should return raw API response structure',
        async () => {
          const result = await executeExtract(extractTool, {
            urls: ['https://example.com'],
            objective: 'Test extraction',
          });

          // Should return raw API response, not wrapped
          expect(result).toHaveProperty('extract_id');
          expect(result).toHaveProperty('results');
          expect(result).toHaveProperty('errors');
          expect(result).not.toHaveProperty('searchParams');
          expect(result).not.toHaveProperty('answer');
        },
        timeout
      );

      it(
        'should have results array with expected properties',
        async () => {
          const result = await executeExtract(extractTool, {
            urls: ['https://www.typescriptlang.org/'],
            objective: 'TypeScript information',
          });

          expect(result.results.length).toBeGreaterThan(0);
          const firstResult = result.results[0];
          expect(firstResult).toHaveProperty('url');
        },
        timeout
      );
    });

    describe.concurrent('createExtractTool factory', () => {
      it(
        'should create tool with custom defaults',
        async () => {
          const customExtractTool = createExtractTool({
            full_content: true,
          });

          const result = await executeExtract(customExtractTool, {
            urls: ['https://example.com'],
            objective: 'Extract full content',
          });

          expect(result).toBeDefined();
          expect(result.extract_id).toBeDefined();
          expect(result.results).toBeDefined();
        },
        timeout
      );
    });
  }
);
