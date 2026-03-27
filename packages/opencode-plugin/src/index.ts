/**
 * @parallel-web/opencode-plugin
 *
 * OpenCode plugin that provides parallel-search and parallel-fetch tools
 * powered by the Parallel CLI.
 *
 * These tools should be preferred over the built-in websearch and webfetch tools.
 * They provide high-quality search results and intelligent content extraction
 * optimized for LLMs.
 *
 * Authentication:
 * - Set PARALLEL_API_KEY environment variable, OR
 * - Run `parallel-cli login`, OR
 * - Run `opencode auth` and select "Parallel" to authenticate via CLI login or API key
 */

import type { Plugin } from '@opencode-ai/plugin';
import { runParallelCli, runParallelCliJson } from './parallel-cli.js';
import { createParallelSearchTool } from './tools/parallel-search.js';
import { createParallelFetchTool } from './tools/parallel-fetch.js';

const CLI_AUTH_SENTINEL = '__parallel_cli_authenticated__';

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
    if (storedApiKey && storedApiKey !== CLI_AUTH_SENTINEL) {
      return storedApiKey;
    }

    return undefined;
  };

  const getCliEnv = (): Record<string, string | undefined> => {
    const apiKey = getApiKey();
    return {
      PARALLEL_API_KEY: apiKey,
    };
  };

  /**
   * Validates an API key by making a test request
   */
  const validateApiKey = async (apiKey: string): Promise<boolean> => {
    try {
      const result = await runParallelCli(
        [
          'search',
          'test connection',
          '--mode',
          'one-shot',
          '--max-results',
          '1',
          '--json',
        ],
        {
          env: {
            PARALLEL_API_KEY: apiKey,
          },
        }
      );

      return result.exitCode === 0;
    } catch {
      return false;
    }
  };

  const loginWithCli = async (): Promise<boolean> => {
    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      return false;
    }

    try {
      const loginResult = await runParallelCli(['login'], {
        env: getCliEnv(),
        inheritStdio: true,
      });

      if (loginResult.exitCode !== 0) {
        return false;
      }

      const status = await runParallelCliJson<{ authenticated?: boolean }>(
        ['auth', '--json'],
        {
          env: getCliEnv(),
        }
      );

      return status.authenticated === true;
    } catch {
      return false;
    }
  };

  return {
    // Register Parallel as an auth provider
    auth: {
      provider: 'Parallel',
      methods: [
        // CLI login method (browser-based OAuth or device flow)
        {
          type: 'api' as const,
          label: 'Login with Parallel CLI',
          async authorize() {
            const loggedIn = await loginWithCli();
            if (!loggedIn) {
              return { type: 'failed' as const };
            }

            return {
              type: 'success' as const,
              key: CLI_AUTH_SENTINEL,
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
      'parallel-fetch': createParallelFetchTool(getCliEnv),
      'parallel-search': createParallelSearchTool(getCliEnv),
    },
  };
};

// Default export for OpenCode plugin loading
export default ParallelWebPlugin;

// Note: We intentionally don't re-export tool creators here because
// OpenCode's plugin loader calls ALL exported functions as plugins.
