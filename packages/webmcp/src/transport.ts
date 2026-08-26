const ENDPOINT = 'https://search.parallel.ai/mcp';
const SESSION_KEY = 'parallel:webmcp:session:v1';
const SESSION_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_OUTPUT_BYTES = 12_000;
const encoder = new TextEncoder();

interface Source {
  url: string;
  title: string | null;
  publish_date: string | null;
  excerpts: string[];
}

interface Output {
  request_id: string;
  results: Source[];
  truncated: boolean;
}

function outputBytes(output: Output): number {
  return encoder.encode(JSON.stringify(output)).byteLength;
}

function normalizeOutput(payload: unknown, tool: string): Output {
  const data = payload as Record<string, unknown> | null;
  const requestId = data?.[tool === 'web_search' ? 'search_id' : 'extract_id'];
  if (typeof requestId !== 'string' || !Array.isArray(data?.results)) {
    throw new Error('Parallel Search returned an unexpected response.');
  }

  const output: Output = {
    request_id: requestId.slice(0, 100),
    results: [],
    truncated: data.results.length > 5,
  };

  for (const value of data.results) {
    if (output.results.length === 5) break;
    const item = value as Record<string, unknown> | null;

    try {
      if (typeof item?.url !== 'string' || item.url.length > 2_048) {
        throw new Error();
      }
      if (!['http:', 'https:'].includes(new URL(item.url).protocol)) {
        throw new Error();
      }
    } catch {
      output.truncated = true;
      continue;
    }

    const source: Source = {
      url: item!.url as string,
      title: typeof item!.title === 'string' ? item!.title.slice(0, 200) : null,
      publish_date:
        typeof item!.publish_date === 'string'
          ? item!.publish_date.slice(0, 32)
          : null,
      excerpts: [],
    };
    output.results.push(source);

    if (outputBytes(output) > MAX_OUTPUT_BYTES) {
      output.results.pop();
      output.truncated = true;
      break;
    }

    if (!Array.isArray(item!.excerpts)) continue;
    for (const excerpt of item!.excerpts) {
      if (typeof excerpt !== 'string') {
        output.truncated = true;
        continue;
      }

      source.excerpts.push(excerpt);
      if (outputBytes(output) <= MAX_OUTPUT_BYTES) continue;

      source.excerpts.pop();
      output.truncated = true;
      const characters = Array.from(excerpt);
      let low = 0;
      let high = characters.length;

      while (low < high) {
        const midpoint = Math.ceil((low + high) / 2);
        source.excerpts.push(characters.slice(0, midpoint).join(''));
        const fits = outputBytes(output) <= MAX_OUTPUT_BYTES;
        source.excerpts.pop();
        if (fits) low = midpoint;
        else high = midpoint - 1;
      }

      if (low) source.excerpts.push(characters.slice(0, low).join(''));
      break;
    }
  }

  return output;
}

export function createTransport(document: Document) {
  let nextRequestId = 0;
  let sessionId: string | undefined;

  function getSessionId(): string {
    if (sessionId) return sessionId;

    try {
      const storage = document.defaultView?.sessionStorage;
      const stored = storage?.getItem(SESSION_KEY);
      sessionId =
        stored && SESSION_PATTERN.test(stored) ? stored : crypto.randomUUID();
      if (stored !== sessionId) storage?.setItem(SESSION_KEY, sessionId);
    } catch {
      sessionId ??= crypto.randomUUID();
    }

    return sessionId;
  }

  return async (
    tool: 'web_search' | 'web_fetch',
    args: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<Output> => {
    const id = ++nextRequestId;
    const session = getSessionId();
    let response: Response;

    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        credentials: 'omit',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'Mcp-Session-Id': session,
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id,
          method: 'tools/call',
          params: { name: tool, arguments: { ...args, session_id: session } },
        }),
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new Error(
        'Parallel Search is unavailable. Check your network and connect-src policy.'
      );
    }

    if (response.status === 429) {
      throw new Error(
        'Parallel Search reached its free rate limit. Try again later.'
      );
    }
    if (!response.ok) {
      throw new Error(`Parallel Search returned HTTP ${response.status}.`);
    }

    let message: {
      id?: unknown;
      error?: unknown;
      result?: { isError?: boolean; structuredContent?: unknown };
    };

    try {
      message = (await response.json()) as typeof message;
    } catch {
      throw new Error('Parallel Search returned an unexpected response.');
    }

    if (message.id !== undefined && message.id !== id) {
      throw new Error('Parallel Search returned a mismatched response.');
    }
    if (message.error || message.result?.isError || !message.result) {
      throw new Error('Parallel Search could not complete the request.');
    }

    return normalizeOutput(message.result.structuredContent, tool);
  };
}
