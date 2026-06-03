/**
 * @parallel-web/ai-sdk-tools
 *
 * AI SDK tools for Parallel Web (AI SDK v6)
 *
 * For AI SDK v5 support, use a previous version of this package (see the README).
 */

// Default tools (MCP-like API)
export { searchTool, createSearchTool } from './tools/search.js';
export { extractTool, createExtractTool } from './tools/extract.js';

// Types for factory options
export type { CreateSearchToolOptions } from './tools/search.js';
export type { CreateExtractToolOptions } from './tools/extract.js';
