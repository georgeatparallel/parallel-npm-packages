import { describe, it, expect } from 'vitest';

describe('@parallel-web/ai-sdk-tools (default export)', () => {
  describe('exports', () => {
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

  describe('default export should match v5', () => {
    it('should use inputSchema (v5 API)', async () => {
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
    it('searchTool should have web_search_parallel description', async () => {
      const { searchTool } = await import('../index.js');
      expect(searchTool.description).toContain('web_search_parallel');
    });

    it('extractTool should have extract description', async () => {
      const { extractTool } = await import('../index.js');
      expect(extractTool.description).toContain('extract relevant content');
    });
  });
});
