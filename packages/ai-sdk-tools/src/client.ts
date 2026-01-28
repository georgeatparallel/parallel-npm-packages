/**
 * Shared Parallel Web client instance
 */

declare const __PACKAGE_VERSION__: string;

import { Parallel } from 'parallel-web';

let _parallelClient: Parallel | null = null;

export const parallelClient = new Proxy({} as Parallel, {
  get(_target, prop) {
    if (!_parallelClient) {
      _parallelClient = new Parallel({
        apiKey: process.env['PARALLEL_API_KEY'],
        defaultHeaders: {
          'X-Tool-Calling-Package': `npm:@parallel-web/ai-sdk-tools/v${__PACKAGE_VERSION__ ?? '0.0.0'}`,
        },
      });
    }
    return (_parallelClient as any)[prop];
  },
});
