import { describe, expect, it, vi } from 'vitest';
import { getSessionId } from '../session.js';
import { createBrowser } from './helpers.js';

const STORAGE_KEY = 'parallel:webmcp:session:v1';

describe('anonymous browser sessions', () => {
  it('generates and stores a random UUID only when a tool is used', () => {
    const browser = createBrowser();

    const session = getSessionId(browser.document);

    expect(session).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(browser.storage.get(STORAGE_KEY)).toBe(session);
  });

  it('reuses the same identity within a document', () => {
    const browser = createBrowser();

    expect(getSessionId(browser.document)).toBe(getSessionId(browser.document));
  });

  it('reuses sessionStorage across same-origin, same-tab reloads', () => {
    const storage = new Map<string, string>();
    const first = createBrowser({ storage });
    const second = createBrowser({ storage });

    expect(getSessionId(first.document)).toBe(getSessionId(second.document));
  });

  it('keeps different browser-tab storage independent', () => {
    const first = createBrowser();
    const second = createBrowser();

    expect(getSessionId(first.document)).not.toBe(
      getSessionId(second.document)
    );
  });

  it('replaces an invalid sessionStorage value', () => {
    const storage = new Map([[STORAGE_KEY, 'invalid-or-user-controlled']]);
    const browser = createBrowser({ storage });

    const session = getSessionId(browser.document);

    expect(session).not.toBe('invalid-or-user-controlled');
    expect(storage.get(STORAGE_KEY)).toBe(session);
  });

  it('keeps a stable in-memory session when storage is blocked', () => {
    const browser = createBrowser({ storageBlocked: true });

    const first = getSessionId(browser.document);

    expect(getSessionId(browser.document)).toBe(first);
    expect(browser.storage.size).toBe(0);
  });

  it('keeps a stable in-memory session when writes are rejected', () => {
    const browser = createBrowser();
    const storage = browser.document.defaultView?.sessionStorage;
    vi.spyOn(storage!, 'setItem').mockImplementation(() => {
      throw new Error('Storage quota exceeded.');
    });

    const first = getSessionId(browser.document);

    expect(getSessionId(browser.document)).toBe(first);
  });
});
