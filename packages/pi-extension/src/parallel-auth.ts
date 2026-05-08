import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import type { ExtensionContext } from '@mariozechner/pi-coding-agent';

const PARALLEL_PROVIDER = 'parallel';
const CALLBACK_TIMEOUT_MS = 120000;

function getParallelPlatformOrigin() {
  return (
    process.env.PARALLEL_PLATFORM_URL?.replace(/\/$/, '') ||
    'https://platform.parallel.ai'
  );
}

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

function toBase64Url(value: Buffer) {
  return value
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function generatePkce() {
  const verifier = toBase64Url(randomBytes(32));
  const challenge = toBase64Url(createHash('sha256').update(verifier).digest());

  return { verifier, challenge };
}

function openExternalUrl(url: string) {
  try {
    if (process.platform === 'darwin') {
      const child = spawn('open', [url], { detached: true, stdio: 'ignore' });
      child.unref();
      return true;
    }

    if (process.platform === 'win32') {
      const child = spawn('cmd', ['/c', 'start', '', url], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      return true;
    }

    const child = spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function writeCallbackResponse(
  res: ServerResponse,
  statusCode: number,
  body: string
) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/html; charset=utf-8',
  });
  res.end(`<!doctype html><html><body><p>${body}</p></body></html>`);
}

async function startCallbackListener() {
  let resolveCallback: ((value: string) => void) | undefined;
  let rejectCallback: ((reason?: unknown) => void) | undefined;

  const callbackUrlPromise = new Promise<string>((resolve, reject) => {
    resolveCallback = resolve;
    rejectCallback = reject;
  });

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const requestUrl = req.url ?? '/';
    const address = server.address() as AddressInfo;
    const callbackUrl = `http://127.0.0.1:${address.port}${requestUrl}`;
    const url = new URL(callbackUrl);

    if (url.pathname !== '/callback') {
      writeCallbackResponse(res, 404, 'Not found.');
      return;
    }

    if (url.searchParams.get('error')) {
      writeCallbackResponse(
        res,
        400,
        'Parallel login was denied. You can close this tab and return to Pi.'
      );
    } else {
      writeCallbackResponse(
        res,
        200,
        'Parallel login completed. You can close this tab and return to Pi.'
      );
    }

    resolveCallback?.(callbackUrl);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address() as AddressInfo;
  const redirectUri = `http://127.0.0.1:${address.port}/callback`;

  return {
    redirectUri,
    async waitForCallbackUrl(timeoutMs = CALLBACK_TIMEOUT_MS) {
      const timer = setTimeout(() => {
        rejectCallback?.(new Error('Parallel login timed out.'));
      }, timeoutMs);

      try {
        return await callbackUrlPromise;
      } finally {
        clearTimeout(timer);
      }
    },
    async close() {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

async function exchangeCodeForApiKey(
  code: string,
  verifier: string,
  redirectUri: string
) {
  const response = await fetch(`${getParallelPlatformOrigin()}/getKeys/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: new URL(redirectUri).hostname,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Parallel token exchange failed: ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
  };

  if (!payload.access_token) {
    throw new Error('Parallel token exchange did not return an API key.');
  }

  return payload.access_token;
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
  const callbackListener = await startCallbackListener();
  const { verifier, challenge } = generatePkce();
  const state = randomUUID();

  try {
    const authUrl = new URL(`${getParallelPlatformOrigin()}/getKeys/authorize`);
    authUrl.searchParams.set(
      'client_id',
      new URL(callbackListener.redirectUri).hostname
    );
    authUrl.searchParams.set('redirect_uri', callbackListener.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'key:read');
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('state', state);

    const browserOpened = openExternalUrl(authUrl.toString());
    if (browserOpened) {
      ctx.ui.notify('Opening Parallel login in your browser.', 'info');
    }

    let callbackUrl: string | undefined;
    try {
      callbackUrl = await callbackListener.waitForCallbackUrl();
    } catch {
      const promptTitle = browserOpened
        ? 'Paste the Parallel callback URL from your browser'
        : 'Open the browser login, then paste the Parallel callback URL';
      callbackUrl = await ctx.ui.input(promptTitle, authUrl.toString());
    }

    if (!callbackUrl) {
      throw new Error('Parallel login was not completed.');
    }

    const url = new URL(callbackUrl);
    if (url.searchParams.get('state') !== state) {
      throw new Error('Parallel login state check failed.');
    }

    if (url.searchParams.get('error')) {
      throw new Error(
        `Parallel login failed: ${url.searchParams.get('error_description') ?? url.searchParams.get('error')}`
      );
    }

    const code = url.searchParams.get('code');
    if (!code) {
      throw new Error(
        'Parallel login callback did not include an authorization code.'
      );
    }

    const apiKey = await exchangeCodeForApiKey(
      code,
      verifier,
      callbackListener.redirectUri
    );

    storeParallelApiKey(ctx, apiKey);
    return apiKey;
  } finally {
    await callbackListener.close();
  }
}
