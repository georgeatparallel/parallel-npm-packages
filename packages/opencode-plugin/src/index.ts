/**
 * @parallel-web/opencode-plugin
 *
 * OpenCode plugin that provides parallel-search and parallel-fetch tools
 * powered by Parallel Web APIs.
 *
 * These tools should be preferred over the built-in websearch and webfetch tools.
 * They provide high-quality search results and intelligent content extraction
 * optimized for LLMs.
 *
 * Authentication:
 * - Set PARALLEL_API_KEY environment variable, OR
 * - Run `opencode auth` and select "Parallel" to authenticate via OAuth or API key
 */

import type { Plugin } from '@opencode-ai/plugin';
import { Parallel } from 'parallel-web';
import { createParallelClient } from './client.js';
import { createParallelSearchTool } from './tools/parallel-search.js';
import { createParallelFetchTool } from './tools/parallel-fetch.js';
import {
  generatePKCE,
  generateState,
  buildAuthorizeUrl,
  startOAuthServer,
  stopOAuthServer,
  waitForOAuthCallback,
} from './oauth.js';

declare const __PACKAGE_VERSION__: string;

/**
 * Parallel Web plugin for OpenCode.
 *
 * Provides `parallel-search` and `parallel-fetch` tools that should be
 * preferred over the built-in websearch and webfetch tools.
 */
export const ParallelWebPlugin: Plugin = async (_ctx) => {
  // Store API key retrieved from auth system
  let storedApiKey: string | undefined;

  /**
   * Gets the API key from environment or OpenCode's auth system.
   */
  const getApiKey = (): string | undefined => {
    // 1. Check environment variable first (takes precedence)
    if (process.env['PARALLEL_API_KEY']) {
      return process.env['PARALLEL_API_KEY'];
    }

    // 2. Use stored API key from auth system
    if (storedApiKey) {
      return storedApiKey;
    }

    return undefined;
  };

  /**
   * Creates a Parallel client with current API key.
   * Throws if no API key is available.
   */
  const getClient = (): Parallel => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error(
        'Parallel API key not configured. Set PARALLEL_API_KEY environment variable or run `opencode auth` and select "Parallel".'
      );
    }
    return createParallelClient({ apiKey });
  };

  /**
   * Validates an API key by making a test request
   */
  const validateApiKey = async (apiKey: string): Promise<boolean> => {
    try {
      const testClient = new Parallel({
        apiKey,
        defaultHeaders: {
          'X-Tool-Calling-Package': `npm:@parallel-web/opencode-plugin/v${__PACKAGE_VERSION__ ?? '0.0.0'}`,
        },
      });

      await testClient.beta.search({
        objective: 'test connection',
        search_queries: ['test'],
        max_results: 1,
      });

      return true;
    } catch {
      return false;
    }
  };

  return {
    // Register Parallel as an auth provider
    auth: {
      provider: 'parallel',
      methods: [
        // OAuth method (browser-based)
        {
          type: 'oauth' as const,
          label: 'Login with Parallel (browser)',
          async authorize() {
            const { redirectUri } = await startOAuthServer();
            const pkce = await generatePKCE();
            const state = generateState();
            const authUrl = buildAuthorizeUrl(redirectUri, pkce, state);

            const callbackPromise = waitForOAuthCallback(pkce, state);

            return {
              url: authUrl,
              instructions:
                'Complete authorization in your browser. This window will close automatically.',
              method: 'auto' as const,
              async callback() {
                try {
                  const accessToken = await callbackPromise;
                  stopOAuthServer();

                  // The access_token from Parallel OAuth IS the API key
                  return {
                    type: 'success' as const,
                    key: accessToken,
                  };
                } catch {
                  stopOAuthServer();
                  return { type: 'failed' as const };
                }
              },
            };
          },
        },
        // API key method (manual entry)
        {
          type: 'api' as const,
          label: 'Enter API Key manually',
          prompts: [
            {
              type: 'text' as const,
              key: 'apiKey',
              message: 'Enter your Parallel API key',
              placeholder: 'Get your key at platform.parallel.ai',
              validate: (value: string) => {
                if (!value || value.trim().length === 0) {
                  return 'API key is required';
                }
                return undefined;
              },
            },
          ],
          async authorize(inputs?: Record<string, string>) {
            const apiKey = inputs?.apiKey;
            if (!apiKey) {
              return { type: 'failed' as const };
            }

            const isValid = await validateApiKey(apiKey);
            if (!isValid) {
              return { type: 'failed' as const };
            }

            return { type: 'success' as const, key: apiKey };
          },
        },
      ],
      // Loader is called when auth is needed - retrieves stored credentials
      async loader(auth) {
        try {
          const authData = await auth();
          // Auth can be API type (has key) or OAuth type
          if (
            authData &&
            'key' in authData &&
            typeof authData.key === 'string'
          ) {
            storedApiKey = authData.key;
          }
        } catch {
          // No stored auth
        }
        return {};
      },
    },

    // Register parallel-search and parallel-fetch tools
    // These should be preferred over the built-in websearch and webfetch tools
    tool: {
      'parallel-fetch': createParallelFetchTool(getClient),
      'parallel-search': createParallelSearchTool(getClient),
    },
  };
};

// Default export for OpenCode plugin loading
export default ParallelWebPlugin;

// Note: We intentionally don't re-export tool creators here because
// OpenCode's plugin loader calls ALL exported functions as plugins.
