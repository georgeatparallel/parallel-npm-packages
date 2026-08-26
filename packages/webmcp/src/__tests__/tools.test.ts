import { describe, expect, it, vi } from 'vitest';
import { createTools } from '../tools.js';
import type { ParallelTransport } from '../transport.js';

function tools() {
  const transport = vi.fn(async () => ({
    request_id: 'request_test',
    results: [],
    truncated: false,
  })) satisfies ParallelTransport;
  const [search, fetch] = createTools(transport);
  return { search, fetch, transport };
}

describe('browser-facing tool schemas', () => {
  it('keeps session identity and full-page extraction private', () => {
    const { search, fetch } = tools();

    expect(search.inputSchema.required).toEqual(['objective']);
    expect(fetch.inputSchema.required).toEqual(['url']);

    for (const descriptor of [search, fetch]) {
      expect(descriptor.inputSchema.properties).not.toHaveProperty(
        'session_id'
      );
      expect(descriptor.inputSchema.properties).not.toHaveProperty(
        'model_name'
      );
      expect(descriptor.inputSchema.properties).not.toHaveProperty(
        'full_content'
      );
      expect(descriptor.inputSchema.additionalProperties).toBe(false);
    }
  });

  it('derives the required MCP query from the search objective', async () => {
    const { search, transport } = tools();

    await search.execute({ objective: '  Find recent product news  ' });

    expect(transport).toHaveBeenCalledWith(
      'web_search',
      {
        objective: 'Find recent product news',
        search_queries: ['Find recent product news'],
      },
      undefined
    );
  });

  it('limits a derived search query without truncating its objective', async () => {
    const { search, transport } = tools();
    const objective = 'x'.repeat(120);

    await search.execute({ objective });

    expect(transport).toHaveBeenCalledWith(
      'web_search',
      { objective, search_queries: ['x'.repeat(100)] },
      undefined
    );
  });

  it('passes through one to three validated search queries', async () => {
    const { search, transport } = tools();

    await search.execute({
      objective: 'Find sources',
      search_queries: [' first ', 'second'],
    });

    expect(transport).toHaveBeenCalledWith(
      'web_search',
      { objective: 'Find sources', search_queries: ['first', 'second'] },
      undefined
    );
  });

  it.each([
    {},
    { objective: '' },
    { objective: '   ' },
    { objective: 'x'.repeat(501) },
    { objective: 'valid', search_queries: [] },
    { objective: 'valid', search_queries: ['1', '2', '3', '4'] },
    { objective: 'valid', search_queries: ['x'.repeat(101)] },
    { objective: 'valid', session_id: 'injected' },
  ])('rejects invalid search arguments: %j', async (input) => {
    const { search, transport } = tools();

    await expect(search.execute(input)).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });

  it('maps one public URL and disables full-page extraction', async () => {
    const { fetch, transport } = tools();

    await fetch.execute({ url: 'https://example.com/page' });

    expect(transport).toHaveBeenCalledWith(
      'web_fetch',
      { urls: ['https://example.com/page'], full_content: false },
      undefined
    );
  });

  it('adds an optional bounded objective and derived fetch query', async () => {
    const { fetch, transport } = tools();

    await fetch.execute({
      url: 'https://example.com/page',
      objective: '  Find pricing information  ',
    });

    expect(transport).toHaveBeenCalledWith(
      'web_fetch',
      {
        urls: ['https://example.com/page'],
        full_content: false,
        objective: 'Find pricing information',
        search_queries: ['Find pricing information'],
      },
      undefined
    );
  });

  it.each([
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/plain,hello',
    'https://user:password@example.com/',
    'http://localhost/',
    'http://service.localhost/',
    'http://service.local/',
    'http://service.internal/',
    'http://127.0.0.1/',
    'http://10.0.0.5/',
    'http://172.20.0.5/',
    'http://192.168.0.5/',
    'http://169.254.169.254/',
    'http://100.100.0.1/',
    'http://[::1]/',
    'http://[fc00::1]/',
    'http://[fe80::1]/',
    'http://[::ffff:127.0.0.1]/',
  ])('rejects non-public fetch URL %s', async (url) => {
    const { fetch, transport } = tools();

    await expect(fetch.execute({ url })).rejects.toThrow(
      'public HTTP or HTTPS'
    );
    expect(transport).not.toHaveBeenCalled();
  });

  it.each([
    { url: '' },
    { url: 'not a url' },
    { url: `https://example.com/${'x'.repeat(2_048)}` },
    { url: 'https://example.com/', objective: 'x'.repeat(201) },
    { url: 'https://example.com/', full_content: true },
    { url: 'https://example.com/', headers: { Authorization: 'secret' } },
  ])('rejects invalid fetch arguments: %j', async (input) => {
    const { fetch, transport } = tools();

    await expect(fetch.execute(input)).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });

  it('forwards the per-execution browser cancellation signal', async () => {
    const { search, fetch, transport } = tools();
    const controller = new AbortController();

    await search.execute(
      { objective: 'Find news' },
      { signal: controller.signal }
    );
    await fetch.execute(
      { url: 'https://example.com/' },
      { signal: controller.signal }
    );

    expect(transport.mock.calls[0]?.[2]).toBe(controller.signal);
    expect(transport.mock.calls[1]?.[2]).toBe(controller.signal);
  });
});
