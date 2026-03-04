/**
 * OAuth utilities for Parallel Web authentication
 */

const CLIENT_ID = 'parallel-web.opencode-plugin';
const OAUTH_PORT = 19532; // Unique port for Parallel OAuth
const AUTH_BASE_URL = 'https://platform.parallel.ai';
const AUTHORIZE_ENDPOINT = `${AUTH_BASE_URL}/getKeys/authorize`;
const TOKEN_ENDPOINT = `${AUTH_BASE_URL}/getKeys/token`;

interface PkceCodes {
  verifier: string;
  challenge: string;
}

/**
 * Generates PKCE code verifier and challenge for OAuth
 */
export async function generatePKCE(): Promise<PkceCodes> {
  const verifier = generateRandomString(43);
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = base64UrlEncode(hash);
  return { verifier, challenge };
}

function generateRandomString(length: number): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const binary = String.fromCharCode(...bytes);
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generates a random state value for CSRF protection
 */
export function generateState(): string {
  return base64UrlEncode(
    crypto.getRandomValues(new Uint8Array(32)).buffer as ArrayBuffer
  );
}

/**
 * Builds the OAuth authorization URL
 */
export function buildAuthorizeUrl(
  redirectUri: string,
  pkce: PkceCodes,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'key:read',
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256',
    state,
  });
  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

/**
 * Exchanges authorization code for access token (API key)
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  pkce: PkceCodes
): Promise<string> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      code_verifier: pkce.verifier,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

// HTML response pages
const HTML_SUCCESS = `<!DOCTYPE html>
<html>
<head>
  <title>Parallel - Authorization Successful</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e; color: #eee; }
    .container { text-align: center; padding: 2rem; }
    h1 { color: #4ade80; }
    p { color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Authorization Successful</h1>
    <p>You can close this window and return to OpenCode.</p>
  </div>
</body>
</html>`;

const HTML_ERROR = (error: string) => `<!DOCTYPE html>
<html>
<head>
  <title>Parallel - Authorization Failed</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #1a1a2e; color: #eee; }
    .container { text-align: center; padding: 2rem; }
    h1 { color: #f87171; }
    p { color: #888; }
    .error { background: #2d1f1f; padding: 1rem; border-radius: 8px; margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Authorization Failed</h1>
    <p>There was an error during authorization.</p>
    <div class="error">${error}</div>
  </div>
</body>
</html>`;

interface PendingOAuth {
  pkce: PkceCodes;
  state: string;
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

let oauthServer: ReturnType<typeof Bun.serve> | undefined;
let pendingOAuth: PendingOAuth | undefined;

/**
 * Starts the local OAuth callback server
 */
export async function startOAuthServer(): Promise<{
  port: number;
  redirectUri: string;
}> {
  if (oauthServer) {
    return {
      port: OAUTH_PORT,
      redirectUri: `http://localhost:${OAUTH_PORT}/callback`,
    };
  }

  oauthServer = Bun.serve({
    port: OAUTH_PORT,
    fetch(req) {
      const url = new URL(req.url);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');
        const errorDescription = url.searchParams.get('error_description');

        if (error) {
          const errorMsg = errorDescription || error;
          pendingOAuth?.reject(new Error(errorMsg));
          pendingOAuth = undefined;
          return new Response(HTML_ERROR(errorMsg), {
            headers: { 'Content-Type': 'text/html' },
          });
        }

        if (!code) {
          const errorMsg = 'Missing authorization code';
          pendingOAuth?.reject(new Error(errorMsg));
          pendingOAuth = undefined;
          return new Response(HTML_ERROR(errorMsg), {
            status: 400,
            headers: { 'Content-Type': 'text/html' },
          });
        }

        if (!pendingOAuth || state !== pendingOAuth.state) {
          const errorMsg = 'Invalid state - potential CSRF attack';
          pendingOAuth?.reject(new Error(errorMsg));
          pendingOAuth = undefined;
          return new Response(HTML_ERROR(errorMsg), {
            status: 400,
            headers: { 'Content-Type': 'text/html' },
          });
        }

        const current = pendingOAuth;
        pendingOAuth = undefined;

        // Exchange code for token
        exchangeCodeForToken(
          code,
          `http://localhost:${OAUTH_PORT}/callback`,
          current.pkce
        )
          .then((token) => current.resolve(token))
          .catch((err) => current.reject(err));

        return new Response(HTML_SUCCESS, {
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (url.pathname === '/cancel') {
        pendingOAuth?.reject(new Error('Login cancelled'));
        pendingOAuth = undefined;
        return new Response('Login cancelled', { status: 200 });
      }

      return new Response('Not found', { status: 404 });
    },
  });

  return {
    port: OAUTH_PORT,
    redirectUri: `http://localhost:${OAUTH_PORT}/callback`,
  };
}

/**
 * Stops the OAuth callback server
 */
export function stopOAuthServer(): void {
  if (oauthServer) {
    oauthServer.stop();
    oauthServer = undefined;
  }
}

/**
 * Waits for the OAuth callback to complete
 */
export function waitForOAuthCallback(
  pkce: PkceCodes,
  state: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        if (pendingOAuth) {
          pendingOAuth = undefined;
          reject(
            new Error('OAuth callback timeout - authorization took too long')
          );
        }
      },
      5 * 60 * 1000 // 5 minute timeout
    );

    pendingOAuth = {
      pkce,
      state,
      resolve: (token) => {
        clearTimeout(timeout);
        resolve(token);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    };
  });
}
