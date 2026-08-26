import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBrowser } from './helpers.js';

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('self-installing browser entry point', () => {
  it('registers the same two tools when imported in a supported browser', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);

    await import('../auto.js');

    await vi.waitFor(() => {
      expect([...browser.registered.keys()]).toEqual([
        'parallel_web_search',
        'parallel_web_fetch',
      ]);
    });
  });

  it('does nothing in browsers without WebMCP', async () => {
    vi.stubGlobal('document', {});
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);

    await import('../auto.js');

    expect(fetch).not.toHaveBeenCalled();
  });

  it('reuses an installation created by the explicit entry point', async () => {
    const browser = createBrowser();
    vi.stubGlobal('document', browser.document);
    const { installParallelWebMcp } = await import('../index.js');

    await installParallelWebMcp();
    await import('../auto.js');

    expect(browser.context.registerTool).toHaveBeenCalledTimes(2);
    expect(browser.registered.size).toBe(2);
  });

  it('reports a safe registration failure without producing an unhandled rejection', async () => {
    const browser = createBrowser({ failOn: 'parallel_web_search' });
    vi.stubGlobal('document', browser.document);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await import('../auto.js');

    await vi.waitFor(() => {
      expect(warning).toHaveBeenCalledWith(
        expect.stringContaining('Could not register website tools')
      );
    });
  });
});
