# Parallel tools for LangChain

Add Parallel Search and Extract to a LangChain JavaScript agent. The tools use
the [Parallel SDK](https://github.com/parallel-web/parallel-sdk-typescript) and
the GA Search and Extract APIs.

This package is an unpublished release proposal. It is not an official
`@langchain` package. You can run it from this repository or install a locally
built tarball. The first npm release needs a Parallel npm organization owner,
as described in the [publishing guide](../../PUBLISHING.md).

## Try it from source

Use Node.js 22.13 or newer and the repository's pinned pnpm version. From the
repository root:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @parallel-web/langchain build
corepack pnpm --filter @parallel-web/langchain test
```

To use the package in another project, pack it from the repository root:

```bash
mkdir -p artifacts
corepack pnpm --dir packages/langchain pack --pack-destination ../../artifacts
```

Then install that tarball alongside `@langchain/core` in your application. The
package supports `@langchain/core` 1.2.9 and later 1.x releases and provides ESM,
CommonJS, and TypeScript declarations. No key is needed just to import it.

## Create the tools

Set `PARALLEL_API_KEY` in your server environment. You can also pass `apiKey`
directly. Do not ship your key in a browser bundle.

```ts
import { randomUUID } from 'node:crypto';
import { createSearchTool, createExtractTool } from '@parallel-web/langchain';

const sessionId = randomUUID();
const search = createSearchTool({
  mode: 'fast',
  maxResults: 5,
  maxOutputChars: 12_000,
  sessionId,
});
const extract = createExtractTool({ maxOutputChars: 12_000, sessionId });

// Pass these standard tools to your LangChain agent's tools array.
const tools = [search, extract];

// Direct invocation returns text, useful outside an agent too.
const content = await search.invoke({
  search_queries: ['Parallel Search API documentation'],
  objective: 'Find the current Search API documentation and its search modes.',
});
console.log(content);
```

Search is named `parallel_web_search`, and Extract is named `parallel_extract`,
matching the [Python integration](https://github.com/parallel-web/langchain-parallel).
There is no separate wrapper for LangGraph or a different agent product.

Search takes `search_queries` with one to five nonblank strings of up to 200
characters each. Extract takes `urls` with one to twenty HTTP or HTTPS URLs.
Both accept an optional `objective` of up to 5,000 characters, or `null`.
Validation happens before an API request. Credentials and request policy are
not part of the model-visible tool schema.

## Keep the complete response

Both tools use LangChain's `content_and_artifact` response format. A normal
`invoke(args)` returns only the bounded text. A tool call with an ID returns a
`ToolMessage` whose `artifact` contains the complete SDK response:

```ts
const message = await extract.invoke({
  type: 'tool_call',
  id: 'read-docs',
  name: extract.name,
  args: {
    urls: ['https://docs.parallel.ai/search/modes'],
    objective: 'Explain the supported search modes.',
  },
});

console.log(message.content); // Text sent back to the model
console.log(message.artifact); // Full structured response for your application
```

The artifact retains URLs, titles, publication dates, excerpts, request and
session IDs, usage, warnings, and Extract's per-URL errors. Requested full
content and error bodies remain there too. The integration does not rename or
discard response fields.

Model-facing text is limited to 20,000 characters by default, including source
metadata and notices. A source URL is shown in full before its text; if it
cannot fit, that section is omitted. Truncation is marked. The same budget is
requested from the API for excerpts, but the local limit still applies when
metadata or full content makes the response larger. The artifact is **not**
truncated, so apply your own storage limits if you persist it.

## Configure requests

| Option | Applies to | Default / behavior |
| --- | --- | --- |
| `apiKey` | Both | Reads `PARALLEL_API_KEY` when omitted |
| `client` | Both | An existing `Parallel` SDK client; use instead of `apiKey` |
| `maxOutputChars` | Both | 20,000; a safe integer of at least 1,024 |
| `sessionId` | Both | Optional; reuse one ID across related Search and Extract calls |
| `fetchPolicy` | Both | SDK policy for cache freshness and live fetching |
| `mode` | Search | `advanced`; also supports `turbo`, `fast`, and `basic` |
| `maxResults` | Search | 10; an integer from 1 to 40 |
| `sourcePolicy` | Search | SDK domain and freshness policy |
| `fullContent` | Extract | `false`; accepts `true` or SDK full-content settings |

Search policy does not restrict URLs passed to Extract. The application owns
any additional URL restrictions. Full content stays in the artifact; the text
prefers relevant excerpts and uses full content only when excerpts are absent.

Inject a client when you need SDK options such as retries or timeouts. Add
`parallel-web` as a direct dependency of your application to use this example:

```ts
import { Parallel } from 'parallel-web';

const client = new Parallel({
  apiKey: process.env.PARALLEL_API_KEY,
  timeout: 30_000,
  maxRetries: 1,
});
const searchWithClient = createSearchTool({ client, mode: 'fast' });

const controller = new AbortController();
const pending = searchWithClient.invoke(
  { search_queries: ['Parallel Search API'] },
  { signal: controller.signal }
);
// Call controller.abort() if the user cancels the request.
await pending;
```

Cancellation is checked before dispatch and passed to the SDK for in-flight
requests. LangChain runnable timeouts also reach the SDK through their signal.
Authentication, rate-limit, timeout, and other SDK errors reject the invocation;
they are not converted into successful text. Extract can return a successful
HTTP response with failures for individual URLs. Those failures are summarized
in the text and preserved in `artifact.errors`.

The tools use authenticated Search and Extract. They do not use anonymous
Search MCP or change your account's access, limits, or billing. Search and
Extract usage follows your Parallel account terms. SDK requests include an
`X-Tool-Calling-Package` header identifying this package and version.

## Run a research agent

The [research example](./examples/research.mjs) uses a real LangChain agent with
both tools. It shares a session ID, asks the agent to read relevant sources,
and requires citations in the answer. Retrieved content is treated as untrusted
data. The example's model adapter is a development dependency, not a runtime
dependency of this package.

Set `PARALLEL_API_KEY`, `OPENAI_API_KEY`, and `RESEARCH_MODEL` in your environment.
Choose a model available to your account that supports tool calling. After the
source setup above, run from the repository root:

```bash
corepack pnpm --filter @parallel-web/langchain example:research -- \
  'What are the current Parallel Search modes? Cite the official documentation.'
```

This command makes live API calls and can incur Parallel and model-provider
usage charges. Missing configuration fails before network access. The
credential-free tests exercise the same agent flow with a scripted model and
controlled SDK transport; passing those tests is not a live-service result.

## Development

```bash
corepack pnpm --filter @parallel-web/langchain test
corepack pnpm --filter @parallel-web/langchain typecheck
corepack pnpm --filter @parallel-web/langchain build
```

Run the root checks before contributing. Do not publish from a feature branch.
An npm release and any upstream LangChain documentation or recommendation need
their own review after this package is accepted.
