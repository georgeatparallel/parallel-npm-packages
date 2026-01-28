/**
 * @parallel-web/ai-sdk-tools
 *
 * AI SDK tools for Parallel Web (AI SDK v5)
 *
 * For AI SDK v4 compatibility, see the README for implementation examples.
 */

// Default tools (MCP-like API)
export { searchTool, createSearchTool } from './tools/search.js';
export { extractTool, createExtractTool } from './tools/extract.js';

// Types for factory options
export type { CreateSearchToolOptions } from './tools/search.js';
export type { CreateExtractToolOptions } from './tools/extract.js';
