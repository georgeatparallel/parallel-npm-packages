/**
 * @parallel-web/opencode-plugin
 *
 * OpenCode plugin that provides parallel-search and parallel-fetch tools
 * powered by the Parallel Web SDK.
 *
 * These tools should be preferred over the built-in websearch and webfetch tools.
 * They provide high-quality search results and intelligent content extraction
 * optimized for LLMs.
 *
 * Authentication:
 * - Set PARALLEL_API_KEY environment variable, OR
 * - Run `opencode auth` and select "Parallel" to sign in via browser OAuth
 *   or paste an API key.
 */

import type { Plugin } from '@opencode-ai/plugin';
import { loginWithParallel } from '@parallel-web/oauth';
import { createParallelSearchTool } from './tools/parallel-search.js';
import { createParallelFetchTool } from './tools/parallel-fetch.js';

export const ParallelWebPlugin: Plugin = async (_ctx) => {
  let storedApiKey: string | undefined;

  const getApiKey = (): string | undefined => {
    if (process.env['PARALLEL_API_KEY']) {
      return process.env['PARALLEL_API_KEY'];
    }
    return storedApiKey;
  };

  return {
    // "Parallel" is registered as an auth provider only to capture an API key
    // for the parallel-search / parallel-fetch tools — it is not a chat/model
    // provider. Once a key is stored, OpenCode enumerates it in Provider.list;
    // with no provider definition it tries to build a model client for an
    // unknown provider and crashes (`JSON Parse error: Unexpected identifier
    // "undefined"`). Declaring it here as a valid, model-less provider lets
    // Provider.list succeed and keeps the auth loader (below) running so our
    // tools can read the stored key. An empty `models` map keeps it out of the
    // model picker.
    config: async (config) => {
      config.provider = config.provider ?? {};
      config.provider['Parallel'] = config.provider['Parallel'] ?? {
        name: 'Parallel',
        models: {},
      };
    },

    auth: {
      provider: 'Parallel',
      methods: [
        {
          type: 'oauth' as const,
          label: 'Login with Parallel (browser)',
          async authorize() {
            // Start the loopback OAuth flow. OpenCode only prints the authorize
            // URL (it doesn't open a browser), so let the helper open it; the
            // printed URL stays as a fallback for headless/SSH sessions.
            let resolveAuthUrl: (url: string) => void;
            const authUrlReady = new Promise<string>((resolve) => {
              resolveAuthUrl = resolve;
            });

            const loginPromise = loginWithParallel({
              openBrowser: true,
              onAuthUrl: (url) => resolveAuthUrl(url),
            });
            // Don't leave the flow's rejection unhandled while we await the URL.
            loginPromise.catch(() => {});

            const url = await authUrlReady;

            return {
              url,
              instructions:
                'Complete the Parallel login in your browser to finish signing in.',
              method: 'auto' as const,
              async callback() {
                try {
                  const { apiKey } = await loginPromise;
                  return { type: 'success' as const, key: apiKey };
                } catch {
                  return { type: 'failed' as const };
                }
              },
            };
          },
        },
        {
          // A bare `type: 'api'` method: OpenCode shows its own single
          // "Enter your API key" prompt and stores the entered key. Don't add
          // a custom `prompts` entry for the key here — that produces a second,
          // duplicate prompt.
          type: 'api' as const,
          label: 'Enter API Key manually',
        },
      ],
      async loader(auth) {
        try {
          const authData = await auth();
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

    tool: {
      'parallel-fetch': createParallelFetchTool(getApiKey),
      'parallel-search': createParallelSearchTool(getApiKey),
    },
  };
};

export default ParallelWebPlugin;
