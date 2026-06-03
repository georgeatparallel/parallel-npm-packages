import { describe, it, expect } from 'vitest';

describe('@parallel-web/ai-sdk-tools exports', () => {
  describe('default tools', () => {
    it('should export searchTool', async () => {
      const { searchTool } = await import('../index.js');
      expect(searchTool).toBeDefined();
      expect(typeof searchTool).toBe('object');
      expect(searchTool.description).toBeDefined();
      expect(typeof searchTool.execute).toBe('function');
    });

    it('should export extractTool', async () => {
      const { extractTool } = await import('../index.js');
      expect(extractTool).toBeDefined();
      expect(typeof extractTool).toBe('object');
      expect(extractTool.description).toBeDefined();
      expect(typeof extractTool.execute).toBe('function');
    });
  });

  describe('factory functions', () => {
    it('should export createSearchTool', async () => {
      const { createSearchTool } = await import('../index.js');
      expect(createSearchTool).toBeDefined();
      expect(typeof createSearchTool).toBe('function');
    });

    it('should export createExtractTool', async () => {
      const { createExtractTool } = await import('../index.js');
      expect(createExtractTool).toBeDefined();
      expect(typeof createExtractTool).toBe('function');
    });

    it('createSearchTool should return a tool with execute function', async () => {
      const { createSearchTool } = await import('../index.js');
      const customTool = createSearchTool({ mode: 'one-shot', max_results: 5 });
      expect(customTool).toBeDefined();
      expect(typeof customTool.execute).toBe('function');
      expect(customTool.description).toBeDefined();
    });

    it('createExtractTool should return a tool with execute function', async () => {
      const { createExtractTool } = await import('../index.js');
      const customTool = createExtractTool({ full_content: true });
      expect(customTool).toBeDefined();
      expect(typeof customTool.execute).toBe('function');
      expect(customTool.description).toBeDefined();
    });

    it('createSearchTool should accept apiKey option', async () => {
      const { createSearchTool } = await import('../index.js');
      const customTool = createSearchTool({
        apiKey: 'test-api-key',
        mode: 'one-shot',
      });
      expect(customTool).toBeDefined();
      expect(typeof customTool.execute).toBe('function');
      expect(customTool.description).toBeDefined();
    });

    it('createExtractTool should accept apiKey option', async () => {
      const { createExtractTool } = await import('../index.js');
      const customTool = createExtractTool({
        apiKey: 'test-api-key',
        full_content: true,
      });
      expect(customTool).toBeDefined();
      expect(typeof customTool.execute).toBe('function');
      expect(customTool.description).toBeDefined();
    });
  });

  describe('AI SDK v6 compatibility', () => {
    it('searchTool should use inputSchema (v6 API)', async () => {
      const { searchTool } = await import('../index.js');
      expect(searchTool).toHaveProperty('inputSchema');
      expect(searchTool).not.toHaveProperty('parameters');
    });

    it('extractTool should use inputSchema (v6 API)', async () => {
      const { extractTool } = await import('../index.js');
      expect(extractTool).toHaveProperty('inputSchema');
      expect(extractTool).not.toHaveProperty('parameters');
    });
  });

  describe('v1 search schema', () => {
    it('searchTool inputSchema should require search_queries', async () => {
      const { searchTool } = await import('../index.js');
      const missing = searchTool.inputSchema.safeParse({
        objective: 'find something',
      });
      expect(missing.success).toBe(false);

      const empty = searchTool.inputSchema.safeParse({
        search_queries: [],
      });
      expect(empty.success).toBe(false);
    });

    it('searchTool inputSchema should accept null for optional fields', async () => {
      const { searchTool } = await import('../index.js');
      const result = searchTool.inputSchema.safeParse({
        search_queries: ['some query'],
        objective: null,
        mode: null,
      });
      expect(result.success).toBe(true);
    });

    it('searchTool inputSchema should accept basic and advanced modes', async () => {
      const { searchTool } = await import('../index.js');
      for (const mode of ['basic', 'advanced'] as const) {
        const result = searchTool.inputSchema.safeParse({
          search_queries: ['some query'],
          mode,
        });
        expect(result.success).toBe(true);
      }
    });

    it('searchTool inputSchema should default mode to advanced', async () => {
      const { searchTool } = await import('../index.js');
      const result = searchTool.inputSchema.safeParse({
        search_queries: ['some query'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe('advanced');
      }
    });

    it('createSearchTool inputSchema should accept null objective', async () => {
      const { createSearchTool } = await import('../index.js');
      const customTool = createSearchTool();
      const result = customTool.inputSchema.safeParse({
        search_queries: ['some query'],
        objective: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('v1 extract schema', () => {
    it('extractTool inputSchema should accept null objective', async () => {
      const { extractTool } = await import('../index.js');
      const result = extractTool.inputSchema.safeParse({
        urls: ['https://example.com'],
        objective: null,
      });
      expect(result.success).toBe(true);
    });

    it('createExtractTool inputSchema should accept null objective', async () => {
      const { createExtractTool } = await import('../index.js');
      const customTool = createExtractTool();
      const result = customTool.inputSchema.safeParse({
        urls: ['https://example.com'],
        objective: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('shared parallelClient', () => {
    it('binds methods to the underlying client instance', async () => {
      // The lazy client is constructed on first property access and requires a
      // key, so provide a dummy one for this no-network check.
      process.env.PARALLEL_API_KEY = process.env.PARALLEL_API_KEY ?? 'test-key';
      const { parallelClient } = await import('../client.js');

      expect(typeof parallelClient.search).toBe('function');
      expect(typeof parallelClient.extract).toBe('function');

      // Methods must be bound to the real instance. An unbound v1 method would
      // run with `this` set to the Proxy and throw "Cannot read private member"
      // when it reads private fields. Function.prototype.bind names the result
      // "bound <name>", which confirms the proxy binds before returning.
      expect(parallelClient.search.name).toBe('bound search');
      expect(parallelClient.extract.name).toBe('bound extract');
    });
  });

  describe('tool descriptions', () => {
    it('searchTool should have web search description', async () => {
      const { searchTool } = await import('../index.js');
      expect(searchTool.description).toContain('web search');
    });

    it('extractTool should have extract description', async () => {
      const { extractTool } = await import('../index.js');
      expect(extractTool.description).toContain('extract relevant content');
    });
  });
});
