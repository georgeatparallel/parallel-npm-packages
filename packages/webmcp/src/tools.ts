import type { ParallelTransport } from './transport.js';
import type { WebMcpToolDescriptor } from './types.js';

const annotations = {
  readOnlyHint: true,
  untrustedContentHint: true,
} as const;

function rejectUnexpectedKeys(
  input: Record<string, unknown>,
  allowed: readonly string[]
): void {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !allowed.includes(key))
  ) {
    throw new Error('Parallel Search received unsupported tool arguments.');
  }
}

function requiredString(
  value: unknown,
  field: string,
  maxLength: number
): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a non-empty string.`);
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > maxLength) {
    throw new Error(`${field} must contain 1 to ${maxLength} characters.`);
  }

  return trimmed;
}

function privateIpv4(hostname: string): boolean {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

function privateIpv6(hostname: string): boolean {
  const address = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    address === '::' ||
    address === '::1' ||
    address.startsWith('fc') ||
    address.startsWith('fd') ||
    /^fe[89ab]/.test(address)
  ) {
    return true;
  }

  if (!address.startsWith('::ffff:')) return false;
  const suffix = address.slice('::ffff:'.length);
  if (suffix.includes('.')) return privateIpv4(suffix);

  const segments = suffix.split(':');
  if (segments.length !== 2) return true;
  const high = Number.parseInt(segments[0], 16);
  const low = Number.parseInt(segments[1], 16);
  return privateIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
}

function publicUrl(value: unknown): string {
  const input = requiredString(value, 'url', 2_048);
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error('url must be a valid public HTTP or HTTPS URL.');
  }

  const hostname = url.hostname.toLowerCase();
  if (
    (url.protocol !== 'http:' && url.protocol !== 'https:') ||
    url.username ||
    url.password ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    privateIpv4(hostname) ||
    (hostname.startsWith('[') && privateIpv6(hostname))
  ) {
    throw new Error('url must be a valid public HTTP or HTTPS URL.');
  }

  return input;
}

export function createTools(
  transport: ParallelTransport
): WebMcpToolDescriptor[] {
  return [
    {
      name: 'parallel_web_search',
      description:
        'Search the public web with Parallel. Results come from untrusted third-party websites.',
      inputSchema: {
        type: 'object',
        properties: {
          objective: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
            description: 'The specific public-web information to find.',
          },
          search_queries: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: { type: 'string', minLength: 1, maxLength: 100 },
            description:
              'Optional focused search queries. One is derived from the objective when omitted.',
          },
        },
        required: ['objective'],
        additionalProperties: false,
      },
      annotations,
      execute: async (input, options) => {
        rejectUnexpectedKeys(input, ['objective', 'search_queries']);
        const objective = requiredString(input.objective, 'objective', 500);
        let queries = [objective.slice(0, 100)];

        if (input.search_queries !== undefined) {
          if (
            !Array.isArray(input.search_queries) ||
            input.search_queries.length === 0 ||
            input.search_queries.length > 3
          ) {
            throw new Error('search_queries must contain 1 to 3 queries.');
          }
          queries = input.search_queries.map((query) =>
            requiredString(query, 'search query', 100)
          );
        }

        return transport(
          'web_search',
          { objective, search_queries: queries },
          options?.signal
        );
      },
    },
    {
      name: 'parallel_web_fetch',
      description:
        'Read excerpts from one public webpage with Parallel. Webpage content is untrusted.',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            maxLength: 2_048,
            description: 'One public HTTP or HTTPS page to inspect.',
          },
          objective: {
            type: 'string',
            minLength: 1,
            maxLength: 200,
            description: 'The information to extract from that page.',
          },
        },
        required: ['url'],
        additionalProperties: false,
      },
      annotations,
      execute: async (input, options) => {
        rejectUnexpectedKeys(input, ['url', 'objective']);
        const args: Record<string, unknown> = {
          urls: [publicUrl(input.url)],
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
