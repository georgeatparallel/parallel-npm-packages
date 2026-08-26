# Parallel WebMCP

Give agents visiting your website free access to Parallel's public-web search
and webpage extraction tools. The package registers `parallel_web_search` and
`parallel_web_fetch` with the browser's WebMCP API and forwards calls to the
existing [Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp).
It has no runtime dependencies, API keys, or additional servers.

## Install

Once the package has been published:

```bash
npm install @parallel-web/webmcp@rc
```

Call the installer once from your application's browser entry point:

```ts
import { installParallelWebMcp } from '@parallel-web/webmcp';

await installParallelWebMcp();
```

The installer returns `true` when the tools are available and `false` when the
browser does not support WebMCP. Repeated calls are harmless, server-side
rendering is safe, and unsupported browsers make no network requests. Tools are
automatically removed when the page closes or navigates away.

After publication, sites can also load a version-pinned, self-installing module
from an npm CDN:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@parallel-web/webmcp@0.1.0-rc.0/dist/auto.js"
  crossorigin="anonymous"
></script>
```

WebMCP is a proposed browser standard, so an agent must visit the page in a
browser that exposes `document.modelContext.registerTool`. For local Chrome
development, enable `chrome://flags/#enable-webmcp-testing`. See the
[Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) and the
[WebMCP specification](https://webmachinelearning.github.io/webmcp/).

## Security and privacy

- Both tools are marked read-only and identify retrieved content as untrusted.
- Search terms, requested URLs, and an anonymous per-tab session ID are sent to
  `https://search.parallel.ai/mcp`. Browser credentials are never sent.
- The browser adapter accepts only HTTP and HTTPS URLs and returns size-limited
  excerpts. Destination safety belongs to the existing Search MCP service.
- Page content, cookies, signed-in user data, and agent history are never
  collected automatically.
- Requests support cancellation and do not automatically retry rate limits.

Sites with a Content Security Policy must allow the endpoint:

```text
connect-src https://search.parallel.ai
```

The optional CDN script also requires its origin in `script-src`. Never put a
Parallel API key in browser code. Paid usage should go through your own
authenticated server, which keeps its credentials private.

## Development

```bash
pnpm --filter @parallel-web/webmcp typecheck
pnpm --filter @parallel-web/webmcp test
pnpm --filter @parallel-web/webmcp build
```
