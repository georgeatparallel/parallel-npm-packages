import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTransport } from '../transport.js';
import {
  createBrowser,
  fetchPayload,
  searchPayload,
  upstreamResponse,
} from './helpers.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('anonymous direct MCP transport', () => {
  it('posts one credentialless tools/call request with a stable session', async () => {
    const browser = createBrowser();
    const fetch = vi.fn(async () => upstreamResponse(1, searchPayload()));
    vi.stubGlobal('fetch', fetch);
    const transport = createTransport(browser.document);

    const result = await transport('web_search', {
      objective: 'Find news',
      search_queries: ['news'],
    });

    expect(result).toEqual({
      request_id: 'search_test',
      results: [
        {
          url: 'https://example.com/result',
          title: 'Example result',
          publish_date: '2026-08-25',
          excerpts: ['A useful public-web excerpt.'],
        },
      ],
      truncated: false,
    });

    const [endpoint, options] = fetch.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    const body = JSON.parse(String(options.body)) as {
      id: number;
      method: string;
      params: { name: string; arguments: Record<string, unknown> };
    };

    expect(endpoint).toBe('https://search.parallel.ai/mcp');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe('omit');
    expect(options.redirect).toBe('error');
    expect(body.method).toBe('tools/call');
    expect(body.params.name).toBe('web_search');
    expect(body.params.arguments.session_id).toBe(
      (options.headers as Record<string, string>)['Mcp-Session-Id']
    );
    expect(options.headers).not.toHaveProperty('Authorization');
    expect(options.headers).not.toHaveProperty('x-api-key');
  });

  it('increments JSON-RPC request IDs and reuses one session across tools', async () => {
    const browser = createBrowser();
    const seen: Array<{ id: number; session: string }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_endpoint: string, options: RequestInit) => {
        const body = JSON.parse(String(options.body)) as {
          id: number;
          params: { name: string; arguments: { session_id: string } };
        };
        seen.push({ id: body.id, session: body.params.arguments.session_id });
        return upstreamResponse(
          body.id,
          body.params.name === 'web_search' ? searchPayload() : fetchPayload()
        );
      })
    );

    const transport = createTransport(browser.document);
    await transport('web_search', {});
    await transport('web_fetch', {});

    expect(seen[0]?.id).toBe(1);
    expect(seen[1]?.id).toBe(2);
    expect(seen[0]?.session).toBe(seen[1]?.session);
  });

  it('parses legacy JSON text content when structured content is absent', async () => {
    const browser = createBrowser();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        upstreamResponse(1, searchPayload(), { structured: false })
      )
    );

    const result = await createTransport(browser.document)('web_search', {});

    expect(result.request_id).toBe('search_test');
  });

  it('prefers structured results over conflicting text content', async () => {
    const browser = createBrowser();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          id: 1,
          result: {
            structuredContent: searchPayload(),
            content: [{ type: 'text', text: 'not valid JSON' }],
          },
        })
      )
    );

    expect(
      await createTransport(browser.document)('web_search', {})
    ).toHaveProperty('request_id', 'search_test');
  });

  it('maps HTTP rate limits to a safe upgrade message without retrying', async () => {
    const browser = createBrowser();
    const fetch = vi.fn(async () => new Response('', { status: 429 }));
    vi.stubGlobal('fetch', fetch);

    await expect(
      createTransport(browser.document)('web_search', {})
    ).rejects.toThrow('free rate limit');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('maps JSON-RPC rate limits to a safe upgrade message', async () => {
    const browser = createBrowser();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ id: 1, error: { message: 'Free-tier rate limit hit' } })
      )
    );

    await expect(
      createTransport(browser.document)('web_search', {})
    ).rejects.toThrow('server-side paid integration');
  });

  it('does not expose arbitrary upstream error text', async () => {
    const browser = createBrowser();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          id: 1,
          error: { message: 'internal secret or opaque diagnostics' },
        })
      )
    );

    await expect(
      createTransport(browser.document)('web_search', {})
    ).rejects.toThrow('could not complete');
    await expect(
      createTransport(browser.document)('web_search', {})
    ).rejects.not.toThrow('secret');
  });

  it('rejects HTTP failures with the public status only', async () => {
    const browser = createBrowser();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 }))
    );

    await expect(
      createTransport(browser.document)('web_search', {})
    ).rejects.toThrow('HTTP 503');
  });

  it('rejects mismatched JSON-RPC response IDs', async () => {
    const browser = createBrowser();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => upstreamResponse(99, searchPayload()))
    );

    await expect(
      createTransport(browser.document)('web_search', {})
    ).rejects.toThrow('mismatched response');
  });

  it('rejects malformed JSON responses', async () => {
    const browser = createBrowser();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not JSON'))
    );

    await expect(
      createTransport(browser.document)('web_search', {})
    ).rejects.toThrow('unexpected response');
  });

  it('rejects malformed fallback text', async () => {
    const browser = createBrowser();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          id: 1,
          result: { content: [{ type: 'text', text: 'not JSON' }] },
        })
      )
    );

    await expect(
      createTransport(browser.document)('web_search', {})
    ).rejects.toThrow('unexpected response');
  });

  it('rejects missing tool results and tool-level failures', async () => {
    const browser = createBrowser();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ id: 1 }))
      .mockResolvedValueOnce(
        upstreamResponse(2, searchPayload(), { isError: true })
      );
    vi.stubGlobal('fetch', fetch);
    const transport = createTransport(browser.document);

    await expect(transport('web_search', {})).rejects.toThrow(
      'could not complete'
    );
    await expect(transport('web_search', {})).rejects.toThrow(
      'could not complete'
    );
  });

  it('reports blocked browser network access without leaking diagnostics', async () => {
    const browser = createBrowser();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('sensitive proxy diagnostics');
      })
    );

    await expect(
      createTransport(browser.document)('web_search', {})
    ).rejects.toThrow('connect-src policy');
  });

  it('forwards and preserves the execution cancellation signal', async () => {
    const browser = createBrowser();
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_endpoint: string, options: RequestInit) => {
        expect(options.signal).toBe(controller.signal);
        controller.abort();
        throw new DOMException('The operation was aborted.', 'AbortError');
      })
    );

    await expect(
      createTransport(browser.document)('web_search', {}, controller.signal)
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('allows only two concurrent requests and recovers after completion', async () => {
    const browser = createBrowser();
    const completions: Array<(response: Response) => void> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          await new Promise<Response>((resolve) => {
            completions.push(resolve);
          })
      )
    );
    const transport = createTransport(browser.document);
    const first = transport('web_search', {});
    const second = transport('web_search', {});

    await expect(transport('web_search', {})).rejects.toThrow('two requests');

    completions[0]?.(upstreamResponse(1, searchPayload()));
    completions[1]?.(upstreamResponse(2, searchPayload()));
    await Promise.all([first, second]);

    const third = transport('web_search', {});
    completions[2]?.(upstreamResponse(3, searchPayload()));
    await expect(third).resolves.toHaveProperty('request_id', 'search_test');
  });
});
