declare const __PACKAGE_VERSION__: string;

import Parallel from 'parallel-web';

export interface ParallelSearchInput {
  objective: string;
  search_queries: string[];
}

export interface ParallelExtractInput {
  urls: string[];
  objective?: string;
}

function createParallelClient(apiKey: string) {
  return new Parallel({
    apiKey,
    defaultHeaders: {
      'X-Tool-Calling-Package': `npm:@parallel-web/opencode-plugin/v${__PACKAGE_VERSION__ ?? '0.0.0'}`,
    },
  });
}

export async function runParallelSearch(
  apiKey: string,
  input: ParallelSearchInput,
  signal?: AbortSignal
) {
  const client = createParallelClient(apiKey);
  return await client.search(
    {
      objective: input.objective,
      search_queries: input.search_queries,
      mode: 'advanced',
    },
    { signal }
  );
}

export async function runParallelExtract(
  apiKey: string,
  input: ParallelExtractInput,
  signal?: AbortSignal
) {
  const client = createParallelClient(apiKey);
  return await client.extract(
    {
      urls: input.urls,
      objective: input.objective,
      advanced_settings: {
        full_content: true,
      },
    },
    { signal }
  );
}

export function isParallelAuthenticationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const status =
    typeof error === 'object' && error !== null && 'status' in error
      ? (error as { status?: number }).status
      : undefined;

  return (
    status === 401 ||
    error.name === 'AuthenticationError' ||
    /unauthorized|authentication|api key/i.test(error.message)
  );
}

const AUTH_ERROR_MESSAGE =
  'Parallel authentication failed — your API key may be invalid or expired. ' +
  'Re-run `opencode auth login` and select Parallel, or set a valid PARALLEL_API_KEY.';

/**
 * Normalizes errors from the Parallel SDK for surfacing to the agent. Auth
 * failures (e.g. an invalid pasted key) become an actionable message — OpenCode
 * cannot validate a key during `auth login`, so this is where a bad key is
 * caught.
 */
export function toParallelToolError(error: unknown): Error {
  if (isParallelAuthenticationError(error)) {
    return new Error(AUTH_ERROR_MESSAGE);
  }
  return error instanceof Error ? error : new Error(String(error));
}
