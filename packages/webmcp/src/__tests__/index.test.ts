import { afterEach, describe, expect, it, vi } from 'vitest';
import { installParallelWebMcp } from '../index.js';
import type { WebMcpToolDescriptor } from '../types.js';
import {
  createBrowser,
  fetchPayload,
  searchPayload,
  upstreamResponse,
} from './helpers.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('installParallelWebMcp', () => {
  it('does nothing when imported into a server-side environment', async () => {
    vi.stubGlobal('document', undefined);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    const installation = await installParallelWebMcp();

    expect(installation.supported).toBe(false);
    expect(installation.tools).toEqual([]);
    expect(() => installation.dispose()).not.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does nothing in a browser without WebMCP support', async () => {
    vi.stubGlobal('document', {});
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    expect(await installParallelWebMcp()).toMatchObject({
      supported: false,
      tools: [],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('registers exactly two namespaced, read-only, untrusted tools', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);

    const installation = await installParallelWebMcp();

    expect(installation.supported).toBe(true);
    expect(installation.tools).toEqual([
      'parallel_web_search',
      'parallel_web_fetch',
    ]);
    expect(browser.registered.size).toBe(2);

    for (const descriptor of browser.registered.values()) {
      expect(descriptor.annotations).toEqual({
        readOnlyHint: true,
        untrustedContentHint: true,
      });
      expect(descriptor.inputSchema.additionalProperties).toBe(false);
      expect(descriptor.inputSchema.properties).not.toHaveProperty(
        'session_id'
      );
      expect(descriptor.inputSchema.properties).not.toHaveProperty(
        'model_name'
      );
    }
  });

  it('preserves unrelated tools when registering and disposing', async () => {
    const unrelated = {
      name: 'page_owned_tool',
    } as unknown as WebMcpToolDescriptor;
    const browser = createBrowser({ existing: [unrelated] });
    vi.stubGlobal('document', browser.document);

    const installation = await installParallelWebMcp();
    expect(browser.registered.has('page_owned_tool')).toBe(true);

    installation.dispose();

    expect([...browser.registered.keys()]).toEqual(['page_owned_tool']);
    expect(browser.context.unregisterTool).not.toHaveBeenCalledWith(
      'page_owned_tool'
    );
  });

  it('reuses one active installation for concurrent and repeated calls', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);

    const [first, second] = await Promise.all([
      installParallelWebMcp(),
      installParallelWebMcp(),
    ]);

    expect(first).toBe(second);
    expect(await installParallelWebMcp()).toBe(first);
    expect(browser.context.registerTool).toHaveBeenCalledTimes(2);
  });

  it('allows a fresh installation after disposal', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);

    const first = await installParallelWebMcp();
    first.dispose();
    first.dispose();

    const second = await installParallelWebMcp();

    expect(second).not.toBe(first);
    expect(browser.registered.size).toBe(2);
    expect(browser.context.registerTool).toHaveBeenCalledTimes(4);
  });

  it('does not remove a page-owned tool that collides with a reserved name', async () => {
    const existing = {
      name: 'parallel_web_search',
    } as unknown as WebMcpToolDescriptor;
    const browser = createBrowser({ existing: [existing] });
    vi.stubGlobal('document', browser.document);

    await expect(installParallelWebMcp()).rejects.toThrow('already registered');

    expect(browser.registered.get('parallel_web_search')).toBe(existing);
    expect(browser.context.unregisterTool).not.toHaveBeenCalled();
  });

  it('rolls back its own first tool when the second registration fails', async () => {
    const browser = createBrowser({ failOn: 'parallel_web_fetch' });
    vi.stubGlobal('document', browser.document);

    await expect(installParallelWebMcp()).rejects.toThrow('already registered');

    expect(browser.registered.size).toBe(0);
    expect(browser.context.unregisterTool).toHaveBeenCalledWith(
      'parallel_web_search'
    );
  });

  it('supports implementations without legacy unregisterTool', async () => {
    const browser = createBrowser();
    delete browser.context.unregisterTool;
    vi.stubGlobal('document', browser.document);

    const installation = await installParallelWebMcp();
    installation.dispose();

    expect(browser.registered.size).toBe(0);
  });

  it('ignores legacy unregister errors after AbortSignal cleanup', async () => {
    const browser = createBrowser();
    browser.context.unregisterTool = vi.fn(() => {
      throw new Error('The tool was already removed.');
    });
    vi.stubGlobal('document', browser.document);

    const installation = await installParallelWebMcp();

    expect(() => installation.dispose()).not.toThrow();
    expect(browser.registered.size).toBe(0);
  });

  it('executes both tools against the existing MCP with one session', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    const requests: Array<Record<string, unknown>> = [];
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as {
        id: number;
        params: { name: string; arguments: Record<string, unknown> };
      };
      requests.push(body.params.arguments);
      return upstreamResponse(
        body.id,
        body.params.name === 'web_search' ? searchPayload() : fetchPayload()
      );
    });
    vi.stubGlobal('fetch', fetch);

    await installParallelWebMcp();
    const search = await browser.registered
      .get('parallel_web_search')
      ?.execute({ objective: 'Find recent product announcements' });
    const extracted = await browser.registered
      .get('parallel_web_fetch')
      ?.execute({ url: 'https://example.com/article' });

    expect(search?.request_id).toBe('search_test');
    expect(extracted?.request_id).toBe('extract_test');
    expect(requests[0]?.session_id).toBe(requests[1]?.session_id);
    expect(requests[0]?.session_id).toEqual(expect.any(String));
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
