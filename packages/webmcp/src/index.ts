import { createTools } from './tools.js';
import { createTransport } from './transport.js';
import type {
  ParallelWebMcpInstallation,
  ParallelWebMcpToolName,
  WebMcpDocument,
  WebMcpModelContext,
} from './types.js';

export type {
  ParallelWebMcpInstallation,
  ParallelWebMcpResult,
  ParallelWebMcpSource,
  ParallelWebMcpToolName,
} from './types.js';

const activeInstallations = new WeakMap<
  Document,
  Promise<ParallelWebMcpInstallation>
>();

function unsupportedInstallation(): ParallelWebMcpInstallation {
  return {
    supported: false,
    tools: [],
    dispose() {},
  };
}

function unregister(
  context: WebMcpModelContext,
  names: readonly ParallelWebMcpToolName[]
): void {
  if (typeof context.unregisterTool !== 'function') return;

  for (const name of names) {
    try {
      context.unregisterTool(name);
    } catch {
      // AbortSignal-capable browsers may have already removed the tool.
    }
  }
}

async function registerTools(
  currentDocument: WebMcpDocument,
  context: WebMcpModelContext
): Promise<ParallelWebMcpInstallation> {
  const lifetime = new AbortController();
  const registered: ParallelWebMcpToolName[] = [];

  try {
    for (const tool of createTools(createTransport(currentDocument))) {
      await context.registerTool(tool, { signal: lifetime.signal });
      registered.push(tool.name);
    }
  } catch (error) {
    lifetime.abort();
    unregister(context, registered);
    throw error;
  }

  let disposed = false;

  return {
    supported: true,
    tools: Object.freeze([...registered]),
    dispose() {
      if (disposed) return;
      disposed = true;
      lifetime.abort();
      unregister(context, registered);
      activeInstallations.delete(currentDocument);
    },
  };
}

export async function installParallelWebMcp(): Promise<ParallelWebMcpInstallation> {
  if (typeof document === 'undefined') return unsupportedInstallation();

  const currentDocument = document as WebMcpDocument;
  const context = currentDocument.modelContext;

  if (!context || typeof context.registerTool !== 'function') {
    return unsupportedInstallation();
  }

  const existing = activeInstallations.get(currentDocument);
  if (existing) return existing;

  const installation = registerTools(currentDocument, context).catch(
    (error) => {
      activeInstallations.delete(currentDocument);
      throw error;
    }
  );

  activeInstallations.set(currentDocument, installation);
  return installation;
}
