/**
 * Tests for AI SDK v4 and v5 compatibility
 */

import { describe, it, expect } from 'vitest';

describe('Version-specific exports', () => {
  describe('v4 exports', () => {
    it('should export searchTool from v4', async () => {
      const { searchTool } = await import('../v4/index.js');
      expect(searchTool).toBeDefined();
      expect(typeof searchTool).toBe('object');
      // v4 uses 'parameters' property (real AI SDK v4 API)
      expect(searchTool).toHaveProperty('parameters');
    });

    it('should export extractTool from v4', async () => {
      const { extractTool } = await import('../v4/index.js');
      expect(extractTool).toBeDefined();
      expect(typeof extractTool).toBe('object');
      // v4 uses 'parameters' property (real AI SDK v4 API)
      expect(extractTool).toHaveProperty('parameters');
    });
  });

  describe('v5 exports', () => {
    it('should export searchTool from v5', async () => {
      const { searchTool } = await import('../v5/index.js');
      expect(searchTool).toBeDefined();
      expect(typeof searchTool).toBe('object');
      // v5 uses 'inputSchema' property
      expect(searchTool).toHaveProperty('inputSchema');
    });

    it('should export extractTool from v5', async () => {
      const { extractTool } = await import('../v5/index.js');
      expect(extractTool).toBeDefined();
      expect(typeof extractTool).toBe('object');
      // v5 uses 'inputSchema' property
      expect(extractTool).toHaveProperty('inputSchema');
    });
  });

  describe('default exports (should be v5)', () => {
    it('should export searchTool from root (v5)', async () => {
      const { searchTool } = await import('../index.js');
      expect(searchTool).toBeDefined();
      expect(typeof searchTool).toBe('object');
      // Default should use v5 API
      expect(searchTool).toHaveProperty('inputSchema');
    });

    it('should export extractTool from root (v5)', async () => {
      const { extractTool } = await import('../index.js');
      expect(extractTool).toBeDefined();
      expect(typeof extractTool).toBe('object');
      // Default should use v5 API
      expect(extractTool).toHaveProperty('inputSchema');
    });
  });

  describe('tool structure validation', () => {
    it('v4 searchTool should have correct structure', async () => {
      const { searchTool } = await import('../v4/index.js');
      expect(searchTool).toHaveProperty('description');
      expect(searchTool).toHaveProperty('parameters');
      expect(searchTool).toHaveProperty('execute');
      expect(typeof searchTool.execute).toBe('function');
    });

    it('v5 searchTool should have correct structure', async () => {
      const { searchTool } = await import('../v5/index.js');
      expect(searchTool).toHaveProperty('description');
      expect(searchTool).toHaveProperty('inputSchema');
      expect(searchTool).toHaveProperty('execute');
      expect(typeof searchTool.execute).toBe('function');
    });

    it('v4 extractTool should have correct structure', async () => {
      const { extractTool } = await import('../v4/index.js');
      expect(extractTool).toHaveProperty('description');
      expect(extractTool).toHaveProperty('parameters');
      expect(extractTool).toHaveProperty('execute');
      expect(typeof extractTool.execute).toBe('function');
    });

    it('v5 extractTool should have correct structure', async () => {
      const { extractTool } = await import('../v5/index.js');
      expect(extractTool).toHaveProperty('description');
      expect(extractTool).toHaveProperty('inputSchema');
      expect(extractTool).toHaveProperty('execute');
      expect(typeof extractTool.execute).toBe('function');
    });
  });
});
