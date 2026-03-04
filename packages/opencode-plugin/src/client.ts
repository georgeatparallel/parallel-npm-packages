/**
 * Parallel Web client factory for OpenCode plugin
 */

declare const __PACKAGE_VERSION__: string;

import { Parallel } from 'parallel-web';

export interface CreateParallelClientOptions {
  apiKey?: string;
}

/**
 * Creates a Parallel client instance with the provided API key.
 * Includes tracking headers for attribution.
 */
export function createParallelClient(
  options: CreateParallelClientOptions = {}
): Parallel {
  const { apiKey } = options;

  if (!apiKey) {
    throw new Error(
      'Parallel API key is required. Set PARALLEL_API_KEY environment variable or run `opencode auth` to authenticate.'
    );
  }

  return new Parallel({
    apiKey,
    defaultHeaders: {
      'X-Tool-Calling-Package': `npm:@parallel-web/opencode-plugin/v${__PACKAGE_VERSION__ ?? '0.0.0'}`,
    },
  });
}
