import { afterEach, describe, expect, it, vi } from 'vitest';
import { installParallelWebMcp } from '../index.js';
import {
  createBrowser,
  fetchPayload,
  searchPayload,
  upstreamResponse,
  type TestTool,
} from './helpers.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockSearch(payload = searchPayload()) {
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { id: number };
    return upstreamResponse(body.id, payload);
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('installParallelWebMcp', () => {
  it.each([undefined, {}])(
    'does nothing without browser WebMCP',
    async (page) => {
      vi.stubGlobal('document', page);
      const fetch = vi.fn();
      vi.stubGlobal('fetch', fetch);

      expect(await installParallelWebMcp()).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it('registers two namespaced, read-only, untrusted tools only once', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);

    expect(await installParallelWebMcp()).toBe(true);
    expect(await installParallelWebMcp()).toBe(true);
    expect([...browser.registered.keys()]).toEqual([
      'parallel_web_search',
      'parallel_web_fetch',
    ]);
    expect(browser.context.registerTool).toHaveBeenCalledTimes(2);

    for (const tool of browser.registered.values()) {
      expect(tool.annotations).toEqual({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
      expect(tool.inputSchema.additionalProperties).toBe(false);
      expect(tool.inputSchema.properties).not.toHaveProperty('session_id');
    }
  });

  it('shares one installation between concurrent callers', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);

    expect(
      await Promise.all([installParallelWebMcp(), installParallelWebMcp()])
    ).toEqual([true, true]);
    expect(browser.context.registerTool).toHaveBeenCalledTimes(2);
  });

  it('preserves unrelated page tools and rolls back partial registration', async () => {
    const unrelated = { name: 'page_owned_tool' } as TestTool;
    const browser = createBrowser({
      existing: [unrelated],
      failOn: 'parallel_web_fetch',
    });
    vi.stubGlobal('document', browser.document);

    await expect(installParallelWebMcp()).rejects.toThrow('already registered');
    expect([...browser.registered.keys()]).toEqual(['page_owned_tool']);
  });

  it('can retry after a browser rejects registration synchronously', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    vi.mocked(browser.context.registerTool).mockImplementationOnce(() => {
      throw new Error('Browser registration failed.');
    });

    await expect(installParallelWebMcp()).rejects.toThrow(
      'registration failed'
    );
    expect(await installParallelWebMcp()).toBe(true);
    expect(browser.registered.size).toBe(2);
  });

  it('calls both upstream tools anonymously with the same stable session', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    const requests: Array<{
      name: string;
      arguments: Record<string, unknown>;
      headers: Record<string, string>;
    }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as {
          id: number;
          params: { name: string; arguments: Record<string, unknown> };
        };
        requests.push({
          ...body.params,
          headers: init.headers as Record<string, string>,
        });
        expect(init.credentials).toBe('omit');
        return upstreamResponse(
          body.id,
          body.params.name === 'web_search' ? searchPayload() : fetchPayload()
        );
      })
    );

    await installParallelWebMcp();
    expect(
      await browser.registered
        .get('parallel_web_search')!
        .execute({ objective: 'Find recent product announcements' })
    ).toMatchObject({ request_id: 'search_test' });
    expect(
      await browser.registered
        .get('parallel_web_fetch')!
        .execute({ url: 'https://example.com/article' })
    ).toMatchObject({ request_id: 'extract_test' });

    expect(requests[0]?.arguments.session_id).toBe(
      requests[1]?.arguments.session_id
    );
    expect(requests[0]?.headers['Mcp-Session-Id']).toBe(
      requests[0]?.arguments.session_id
    );
    expect(requests[0]?.headers).not.toHaveProperty('Authorization');
    expect(requests[1]?.arguments).toMatchObject({ full_content: false });
  });

  it('reuses the anonymous session after a same-tab page reload', async () => {
    const storage = new Map<string, string>();
    const sessions: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as {
          id: number;
          params: { arguments: { session_id: string } };
        };
        sessions.push(body.params.arguments.session_id);
        return upstreamResponse(body.id, searchPayload());
      })
    );

    for (const browser of [
      createBrowser({ storage }),
      createBrowser({ storage }),
    ]) {
      vi.stubGlobal('document', browser.document);
      await installParallelWebMcp();
      await browser.registered
        .get('parallel_web_search')!
        .execute({ objective: 'news' });
    }

    expect(sessions[0]).toBe(sessions[1]);
  });

  it('keeps a stable in-memory session when browser storage is blocked', async () => {
    const browser = createBrowser({ storageBlocked: true });
    vi.stubGlobal('document', browser.document);
    const fetch = mockSearch();
    await installParallelWebMcp();
    const search = browser.registered.get('parallel_web_search')!;

    await search.execute({ objective: 'first' });
    await search.execute({ objective: 'second' });

    const first = JSON.parse(String(fetch.mock.calls[0]![1].body));
    const second = JSON.parse(String(fetch.mock.calls[1]![1].body));
    expect(first.params.arguments.session_id).toBe(
      second.params.arguments.session_id
    );
  });

  it('validates search inputs and rejects non-HTTP fetch URLs', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    await installParallelWebMcp();

    expect(() =>
      browser.registered.get('parallel_web_search')!.execute({ objective: ' ' })
    ).toThrow('objective');
    expect(() =>
      browser.registered
        .get('parallel_web_fetch')!
        .execute({ url: 'javascript:alert(1)' })
    ).toThrow('HTTP or HTTPS');
  });

  it('rejects fetch URLs containing embedded credentials before contacting Parallel', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await installParallelWebMcp();

    expect(() =>
      browser.registered
        .get('parallel_web_fetch')!
        .execute({ url: 'https://username:password@example.com/article' })
    ).toThrow('HTTP or HTTPS');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('bounds untrusted UTF-8 output without exposing upstream metadata', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    mockSearch(
      searchPayload({
        session_id: 'private-upstream-session',
        results: [
          {
            url: 'https://example.com/source',
            title: 'Source',
            excerpts: ['🌍'.repeat(10_000)],
            full_content: 'never expose full content',
          },
        ],
      })
    );
    await installParallelWebMcp();

    const output = await browser.registered
      .get('parallel_web_search')!
      .execute({ objective: 'news' });

    expect(
      new TextEncoder().encode(JSON.stringify(output)).byteLength
    ).toBeLessThanOrEqual(12_000);
    expect(output).toMatchObject({ truncated: true });
    expect(output).not.toHaveProperty('session_id');
    expect(JSON.stringify(output)).not.toContain('full_content');
  });

  it('preserves later source citations when an earlier excerpt exceeds the output limit', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    const sources = Array.from({ length: 5 }, (_, index) => ({
      url: `https://example.com/source-${index}`,
      title: `Source ${index}`,
      excerpts: [index === 0 ? '🌍'.repeat(10_000) : `Excerpt ${index}`],
    }));
    mockSearch(searchPayload({ results: sources }));
    await installParallelWebMcp();

    const output = (await browser.registered
      .get('parallel_web_search')!
      .execute({ objective: 'news' })) as {
      results: Array<{ url: string }>;
      truncated: boolean;
    };

    expect(output.results.map((source) => source.url)).toEqual(
      sources.map((source) => source.url)
    );
    expect(output.truncated).toBe(true);
    expect(
      new TextEncoder().encode(JSON.stringify(output)).byteLength
    ).toBeLessThanOrEqual(12_000);
  });

  it('accepts standard MCP text results when structured content is absent', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        upstreamResponse(1, searchPayload(), { structured: false })
      )
    );
    await installParallelWebMcp();

    await expect(
      browser.registered
        .get('parallel_web_search')!
        .execute({ objective: 'news' })
    ).resolves.toMatchObject({ request_id: 'search_test' });
  });

  it('forwards execution cancellation to the browser request', async () => {
    const browser = createBrowser();
    const controller = new AbortController();
    vi.stubGlobal('document', browser.document);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        expect(init.signal).toBe(controller.signal);
        controller.abort();
        throw new DOMException('Aborted', 'AbortError');
      })
    );
    await installParallelWebMcp();

    await expect(
      browser.registered
        .get('parallel_web_search')!
        .execute({ objective: 'news' }, { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('reports free-tier rate limits without retrying', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    const fetch = vi.fn(async () => new Response('', { status: 429 }));
    vi.stubGlobal('fetch', fetch);
    await installParallelWebMcp();

    await expect(
      browser.registered
        .get('parallel_web_search')!
        .execute({ objective: 'news' })
    ).rejects.toThrow('free rate limit');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('never exposes arbitrary server errors to the agent', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ id: 1, error: { message: 'private diagnostics' } })
      )
    );
    await installParallelWebMcp();

    await expect(
      browser.registered
        .get('parallel_web_search')!
        .execute({ objective: 'news' })
    ).rejects.toThrow('could not complete');
  });
});
