import { describe, it, expect, beforeAll } from 'vitest';

describe('@parallel-web/ai-sdk-tools/v5', () => {
  describe('exports', () => {
    it('should export searchTool', async () => {
      const { searchTool } = await import('../v5/index.js');
      expect(searchTool).toBeDefined();
      expect(typeof searchTool).toBe('object');
      expect(searchTool.description).toBeDefined();
      expect(searchTool.inputSchema).toBeDefined(); // v5 uses 'inputSchema'
      expect(typeof searchTool.execute).toBe('function');
    });

    it('should export extractTool', async () => {
      const { extractTool } = await import('../v5/index.js');
      expect(extractTool).toBeDefined();
      expect(typeof extractTool).toBe('object');
      expect(extractTool.description).toBeDefined();
      expect(extractTool.inputSchema).toBeDefined(); // v5 uses 'inputSchema'
      expect(typeof extractTool.execute).toBe('function');
    });
  });

  describe('searchTool - unit tests', () => {
    let searchTool: any;

    beforeAll(async () => {
      const module = await import('../v5/index.js');
      searchTool = module.searchTool;
    });

    it('should have correct tool structure', () => {
      expect(searchTool.description).toContain('web_search_parallel');
      expect(searchTool.inputSchema).toBeDefined();
      expect(typeof searchTool.execute).toBe('function');
    });

    describe('input schema validation', () => {
      it('should accept valid objective parameter only', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Find latest news about AI',
        });
        expect(result.success).toBe(true);
      });

      it('should accept objective with search_queries', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Find AI news',
          search_queries: ['AI news', 'machine learning'],
        });
        expect(result.success).toBe(true);
      });

      it('should accept valid search_type: list', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Test query',
          search_type: 'list',
        });
        expect(result.success).toBe(true);
      });

      it('should accept valid search_type: targeted', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Test query',
          search_type: 'targeted',
        });
        expect(result.success).toBe(true);
      });

      it('should accept valid search_type: general', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Test query',
          search_type: 'general',
        });
        expect(result.success).toBe(true);
      });

      it('should accept valid search_type: single_page', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Test query',
          search_type: 'single_page',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid search_type', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Test query',
          search_type: 'invalid',
        });
        expect(result.success).toBe(false);
      });

      it('should default search_type to list when not provided', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Test query',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.search_type).toBe('list');
        }
      });

      it('should accept include_domains parameter', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Test query',
          include_domains: ['example.com', 'test.org'],
        });
        expect(result.success).toBe(true);
      });

      it('should accept all parameters together', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Complex search',
          search_queries: ['query1', 'query2'],
          search_type: 'targeted',
          include_domains: ['example.com'],
        });
        expect(result.success).toBe(true);
      });

      it('should reject non-string objective', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 123,
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-array search_queries', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Test',
          search_queries: 'not an array',
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-array include_domains', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Test',
          include_domains: 'not an array',
        });
        expect(result.success).toBe(false);
      });

      it('should accept empty arrays for optional parameters', () => {
        const result = searchTool.inputSchema.safeParse({
          objective: 'Test query',
          search_queries: [],
          include_domains: [],
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('extractTool - unit tests', () => {
    let extractTool: any;

    beforeAll(async () => {
      const module = await import('../v5/index.js');
      extractTool = module.extractTool;
    });

    it('should have correct tool structure', () => {
      expect(extractTool.description).toContain('extract relevant content');
      expect(extractTool.inputSchema).toBeDefined();
      expect(typeof extractTool.execute).toBe('function');
    });

    describe('input schema validation', () => {
      it('should accept valid objective and urls', () => {
        const result = extractTool.inputSchema.safeParse({
          objective: 'Extract information',
          urls: ['https://example.com'],
        });
        expect(result.success).toBe(true);
      });

      it('should accept multiple urls', () => {
        const result = extractTool.inputSchema.safeParse({
          objective: 'Extract data',
          urls: ['https://example.com', 'https://test.org'],
        });
        expect(result.success).toBe(true);
      });

      it('should accept optional search_queries', () => {
        const result = extractTool.inputSchema.safeParse({
          objective: 'Extract info',
          urls: ['https://example.com'],
          search_queries: ['keyword1', 'keyword2'],
        });
        expect(result.success).toBe(true);
      });

      it('should reject missing urls', () => {
        const result = extractTool.inputSchema.safeParse({
          objective: 'Extract info',
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-array urls', () => {
        const result = extractTool.inputSchema.safeParse({
          objective: 'Extract info',
          urls: 'not an array',
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
