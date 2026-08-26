import { createTransport } from './transport.js';

interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: true; untrustedContentHint: true };
  execute(
    input: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ): Promise<unknown>;
}

interface WebMcpDocument extends Document {
  modelContext?: {
    registerTool(
      tool: WebMcpTool,
      options?: { signal?: AbortSignal }
    ): void | Promise<void>;
    unregisterTool?(name: string): void;
  };
}

const installations = new WeakMap<Document, Promise<boolean>>();
const annotations = { readOnlyHint: true, untrustedContentHint: true } as const;

function requiredString(value: unknown, name: string, limit: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) {
    throw new Error(`${name} must contain 1 to ${limit} characters.`);
  }

  return value.trim();
}

function createTools(document: Document): WebMcpTool[] {
  const transport = createTransport(document);

  return [
    {
      name: 'parallel_web_search',
      description:
        'Search the public web with Parallel. Results contain untrusted third-party content.',
      inputSchema: {
        type: 'object',
        properties: {
          objective: { type: 'string', minLength: 1, maxLength: 500 },
          search_queries: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: { type: 'string', minLength: 1, maxLength: 100 },
          },
        },
        required: ['objective'],
        additionalProperties: false,
      },
      annotations,
      execute(input, options) {
        const objective = requiredString(input.objective, 'objective', 500);
        let searchQueries = [objective.slice(0, 100)];

        if (input.search_queries !== undefined) {
          if (
            !Array.isArray(input.search_queries) ||
            input.search_queries.length < 1 ||
            input.search_queries.length > 3
          ) {
            throw new Error('search_queries must contain 1 to 3 queries.');
          }

          searchQueries = input.search_queries.map((query) =>
            requiredString(query, 'search query', 100)
          );
        }

        return transport(
          'web_search',
          { objective, search_queries: searchQueries },
          options?.signal
        );
      },
    },
    {
      name: 'parallel_web_fetch',
      description:
        'Read excerpts from a public webpage with Parallel. Webpage content is untrusted.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', format: 'uri', maxLength: 2_048 },
          objective: { type: 'string', minLength: 1, maxLength: 200 },
        },
        required: ['url'],
        additionalProperties: false,
      },
      annotations,
      execute(input, options) {
        const url = requiredString(input.url, 'url', 2_048);

        try {
          if (!['http:', 'https:'].includes(new URL(url).protocol)) {
            throw new Error();
          }
        } catch {
          throw new Error('url must be a valid HTTP or HTTPS URL.');
        }

        const args: Record<string, unknown> = {
          urls: [url],
          full_content: false,
        };

        if (input.objective !== undefined) {
          const objective = requiredString(input.objective, 'objective', 200);
          args.objective = objective;
          args.search_queries = [objective.slice(0, 100)];
        }

        return transport('web_fetch', args, options?.signal);
      },
    },
  ];
}

/** Register Parallel's page-scoped search tools when the browser supports WebMCP. */
export async function installParallelWebMcp(): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const currentDocument = document as WebMcpDocument;
  const context = currentDocument.modelContext;
  if (typeof context?.registerTool !== 'function') return false;

  const existing = installations.get(currentDocument);
  if (existing) return existing;

  const installation = (async () => {
    const registration = new AbortController();
    const registered: string[] = [];

    try {
      for (const tool of createTools(currentDocument)) {
        await context.registerTool(tool, { signal: registration.signal });
        registered.push(tool.name);
      }

      return true;
    } catch (error) {
      registration.abort();
      for (const name of registered) {
        try {
          context.unregisterTool?.(name);
        } catch {
          // Abort-capable browsers may already have removed this tool.
        }
      }
      throw error;
    }
  })().catch((error: unknown) => {
    installations.delete(currentDocument);
    throw error;
  });

  installations.set(currentDocument, installation);
  return installation;
}
