import { normalizeOutput } from './output.js';
import { getSessionId } from './session.js';
import type { ParallelWebMcpResult } from './types.js';

const MCP_ENDPOINT = 'https://search.parallel.ai/mcp';
const MAX_CONCURRENT_REQUESTS = 2;

export type ParallelTransport = (
  tool: 'web_search' | 'web_fetch',
  args: Record<string, unknown>,
  signal?: AbortSignal
) => Promise<ParallelWebMcpResult>;

interface JsonRpcResponse {
  id?: unknown;
  error?: { message?: unknown };
  result?: {
    isError?: boolean;
    structuredContent?: unknown;
    content?: Array<{ type?: unknown; text?: unknown }>;
  };
}

function readPayload(result: NonNullable<JsonRpcResponse['result']>): unknown {
  if (
    typeof result.structuredContent === 'object' &&
    result.structuredContent
  ) {
    return result.structuredContent;
  }

  const text = result.content?.find((item) => item.type === 'text')?.text;
  if (typeof text !== 'string') {
    throw new Error('Parallel Search returned an unexpected response.');
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('Parallel Search returned an unexpected response.');
  }
}

function serverError(message: unknown): Error {
  if (
    typeof message === 'string' &&
    /rate.limit|too many requests/i.test(message)
  ) {
    return new Error(
      'Parallel Search reached its free rate limit. Try again later or use a server-side paid integration.'
    );
  }

  return new Error('Parallel Search could not complete the request.');
}

export function createTransport(document: Document): ParallelTransport {
  let nextRequestId = 0;
  let activeRequests = 0;

  return async (tool, args, signal) => {
    if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
      throw new Error(
        'Parallel Search already has two requests in progress. Try again shortly.'
      );
    }

    activeRequests += 1;

    try {
      const requestId = ++nextRequestId;
      const sessionId = getSessionId(document);
      let response: Response;
      try {
        response = await fetch(MCP_ENDPOINT, {
          method: 'POST',
          credentials: 'omit',
          redirect: 'error',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
            'Mcp-Session-Id': sessionId,
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: requestId,
            method: 'tools/call',
            params: {
              name: tool,
              arguments: { ...args, session_id: sessionId },
            },
          }),
          ...(signal ? { signal } : {}),
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        throw new Error(
          'Parallel Search is unavailable. Check your network and connect-src policy.'
        );
      }

      if (response.status === 429) throw serverError('rate limit');
      if (!response.ok) {
        throw new Error(`Parallel Search returned HTTP ${response.status}.`);
      }

      let message: JsonRpcResponse;
      try {
        message = (await response.json()) as JsonRpcResponse;
      } catch {
        throw new Error('Parallel Search returned an unexpected response.');
      }

      if (message.id !== undefined && message.id !== requestId) {
        throw new Error('Parallel Search returned a mismatched response.');
      }
      if (message.error) throw serverError(message.error.message);
      if (!message.result || message.result.isError) {
        throw serverError(undefined);
      }

      return normalizeOutput(readPayload(message.result), tool);
    } finally {
      activeRequests -= 1;
    }
  };
}
