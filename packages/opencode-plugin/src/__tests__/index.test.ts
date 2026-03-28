import { describe, it, expect, vi } from 'vitest';

type SchemaBuilder = Record<string, () => SchemaBuilder>;

// Mock the @opencode-ai/plugin module since it has a broken dist
vi.mock('@opencode-ai/plugin', () => {
  // Create a chainable schema builder mock
  const createChainableSchema = (): SchemaBuilder => {
    const builder: SchemaBuilder = {} as SchemaBuilder;
    const methods = ['string', 'array', 'object', 'optional', 'describe'];
    methods.forEach((method) => {
      builder[method] = () => builder;
    });
    return builder;
  };

  const schema = createChainableSchema();
  return {
    tool: Object.assign(
      (config: {
        description: string;
        args: unknown;
        execute: (...args: unknown[]) => unknown;
      }) => ({
        description: config.description,
        args: config.args,
        execute: config.execute,
      }),
      { schema }
    ),
  };
});

describe('@parallel-web/opencode-plugin exports', () => {
  describe('default export', () => {
    it('should export ParallelWebPlugin as default', async () => {
      const module = await import('../index.js');
      expect(module.default).toBeDefined();
      expect(typeof module.default).toBe('function');
    });

    it('should export ParallelWebPlugin as named export', async () => {
      const { ParallelWebPlugin } = await import('../index.js');
      expect(ParallelWebPlugin).toBeDefined();
      expect(typeof ParallelWebPlugin).toBe('function');
    });

    it('default export should be the same as ParallelWebPlugin', async () => {
      const module = await import('../index.js');
      expect(module.default).toBe(module.ParallelWebPlugin);
    });
  });

  describe('plugin function', () => {
    it('should return plugin config when called', async () => {
      const { ParallelWebPlugin } = await import('../index.js');
      const mockContext = {} as Parameters<typeof ParallelWebPlugin>[0];
      const pluginConfig = await ParallelWebPlugin(mockContext);

      expect(pluginConfig).toBeDefined();
      expect(typeof pluginConfig).toBe('object');
    });

    it('should register auth provider', async () => {
      const { ParallelWebPlugin } = await import('../index.js');
      const mockContext = {} as Parameters<typeof ParallelWebPlugin>[0];
      const pluginConfig = await ParallelWebPlugin(mockContext);

      expect(pluginConfig.auth).toBeDefined();
      expect(pluginConfig.auth?.provider).toBe('Parallel');
      expect(pluginConfig.auth?.methods).toBeDefined();
      expect(Array.isArray(pluginConfig.auth?.methods)).toBe(true);
    });

    it('should register parallel-search and parallel-fetch tools', async () => {
      const { ParallelWebPlugin } = await import('../index.js');
      const mockContext = {} as Parameters<typeof ParallelWebPlugin>[0];
      const pluginConfig = await ParallelWebPlugin(mockContext);

      expect(pluginConfig.tool).toBeDefined();
      expect(pluginConfig.tool?.['parallel-search']).toBeDefined();
      expect(pluginConfig.tool?.['parallel-fetch']).toBeDefined();
    });
  });

  describe('tool definitions', () => {
    it('parallel-search tool should have description and execute function', async () => {
      const { ParallelWebPlugin } = await import('../index.js');
      const mockContext = {} as Parameters<typeof ParallelWebPlugin>[0];
      const pluginConfig = await ParallelWebPlugin(mockContext);

      const searchTool = pluginConfig.tool?.['parallel-search'];
      expect(searchTool).toBeDefined();
      expect(searchTool?.description).toContain('Search');
      expect(typeof searchTool?.execute).toBe('function');
    });

    it('parallel-fetch tool should have description and execute function', async () => {
      const { ParallelWebPlugin } = await import('../index.js');
      const mockContext = {} as Parameters<typeof ParallelWebPlugin>[0];
      const pluginConfig = await ParallelWebPlugin(mockContext);

      const fetchTool = pluginConfig.tool?.['parallel-fetch'];
      expect(fetchTool).toBeDefined();
      expect(fetchTool?.description).toContain('Fetch');
      expect(typeof fetchTool?.execute).toBe('function');
    });
  });
});
