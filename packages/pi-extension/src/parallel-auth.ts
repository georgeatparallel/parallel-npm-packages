import type { ExtensionContext } from '@mariozechner/pi-coding-agent';
import { loginWithParallel as runParallelOAuth } from '@parallel-web/oauth';

const PARALLEL_PROVIDER = 'parallel';

type ApiKeyCredential = {
  type: 'api_key';
  key: string;
};

type ParallelAuthStorage = {
  get(provider: string): ApiKeyCredential | undefined;
  set(provider: string, credential: ApiKeyCredential): void;
  remove(provider: string): void;
  getApiKey?(provider: string): Promise<string | undefined>;
};

function getAuthStorage(ctx: ExtensionContext): ParallelAuthStorage {
  return ctx.modelRegistry.authStorage as ParallelAuthStorage;
}

export async function getParallelApiKey(ctx: ExtensionContext) {
  const authStorage = getAuthStorage(ctx);
  if (authStorage.getApiKey) {
    const apiKey = await authStorage.getApiKey(PARALLEL_PROVIDER);
    if (apiKey) {
      return apiKey;
    }
  }

  const storedApiKey = authStorage.get(PARALLEL_PROVIDER)?.key;
  if (storedApiKey) {
    return storedApiKey;
  }

  return process.env.PARALLEL_API_KEY;
}

export function clearStoredParallelApiKey(ctx: ExtensionContext) {
  getAuthStorage(ctx).remove(PARALLEL_PROVIDER);
}

export function storeParallelApiKey(ctx: ExtensionContext, apiKey: string) {
  getAuthStorage(ctx).set(PARALLEL_PROVIDER, {
    type: 'api_key',
    key: apiKey,
  });
}

export async function loginWithParallel(ctx: ExtensionContext) {
  const { apiKey } = await runParallelOAuth({
    onAuthUrl: (_url, browserOpened) => {
      if (browserOpened) {
        ctx.ui.notify('Opening Parallel login in your browser.', 'info');
      }
    },
    promptForCallback: async (authUrl) => {
      return await ctx.ui.input(
        'Paste the Parallel callback URL from your browser',
        authUrl
      );
    },
  });

  storeParallelApiKey(ctx, apiKey);
  return apiKey;
}
