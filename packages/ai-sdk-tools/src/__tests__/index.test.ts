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
  });

  describe('AI SDK v5 compatibility', () => {
    it('searchTool should use inputSchema (v5 API)', async () => {
      const { searchTool } = await import('../index.js');
      expect(searchTool).toHaveProperty('inputSchema');
      expect(searchTool).not.toHaveProperty('parameters');
    });

    it('extractTool should use inputSchema (v5 API)', async () => {
      const { extractTool } = await import('../index.js');
      expect(extractTool).toHaveProperty('inputSchema');
      expect(extractTool).not.toHaveProperty('parameters');
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
