/**
 * Shared Parallel Web client instance
 */

import { Parallel } from 'parallel-web';

let _parallelClient: Parallel | null = null;

export const parallelClient = new Proxy({} as Parallel, {
  get(_target, prop) {
    if (!_parallelClient) {
      _parallelClient = new Parallel({
        apiKey: process.env['PARALLEL_API_KEY'],
      });
    }
    return (_parallelClient as any)[prop];
  },
});
