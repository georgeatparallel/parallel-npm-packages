const SESSION_KEY = 'parallel:webmcp:session:v1';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const documentSessions = new WeakMap<Document, string>();

export function getSessionId(document: Document): string {
  const remembered = documentSessions.get(document);
  if (remembered) return remembered;

  let storage: Storage | undefined;

  try {
    storage = document.defaultView?.sessionStorage;
    const stored = storage?.getItem(SESSION_KEY);
    if (stored && UUID_PATTERN.test(stored)) {
      documentSessions.set(document, stored);
      return stored;
    }
  } catch {
    storage = undefined;
  }

  const sessionId = globalThis.crypto.randomUUID();
  documentSessions.set(document, sessionId);

  try {
    storage?.setItem(SESSION_KEY, sessionId);
  } catch {
    // Storage can be disabled while in-memory session reuse remains safe.
  }

  return sessionId;
}
