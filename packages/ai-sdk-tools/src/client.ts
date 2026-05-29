/**
 * Shared Parallel Web client instance
 */

declare const __PACKAGE_VERSION__: string;

import { Parallel } from 'parallel-web';

let _parallelClient: Parallel | null = null;

export const parallelClient = new Proxy({} as Parallel, {
  get(_target, prop: keyof Parallel) {
    if (!_parallelClient) {
      _parallelClient = new Parallel({
        apiKey: process.env['PARALLEL_API_KEY'],
        defaultHeaders: {
          'X-Tool-Calling-Package': `npm:@parallel-web/ai-sdk-tools/v${__PACKAGE_VERSION__ ?? '0.0.0'}`,
        },
      });
    }
    const value = _parallelClient[prop];
    // Bind methods (e.g. `search`, `extract`) to the real client instance.
    // They read private fields via `this`; returning them unbound would make
    // `this` the Proxy and throw "Cannot read private member" at call time.
    return typeof value === 'function' ? value.bind(_parallelClient) : value;
  },
});
