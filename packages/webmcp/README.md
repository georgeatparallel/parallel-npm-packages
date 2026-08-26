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

To share tools with an agent running on a different origin, explicitly allow its
trusted origin when installing:

```ts
await installParallelWebMcp({
  exposedTo: ['https://agent.example'],
});
```

The agent must also request your site's origin through
`document.modelContext.getTools({ fromOrigins: ['https://your-site.example'] })`.
Cross-origin access is disabled by default. Use the configurable installer above
instead of the self-installing script when cross-origin agents need access.

After publication, sites can also load a version-pinned, self-installing module
from an npm CDN:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@parallel-web/webmcp@0.1.0-rc.0/dist/auto.js"
  crossorigin="anonymous"
></script>
```

## Browser requirements

WebMCP is a proposed browser standard, so agents need a browser that exposes
`document.modelContext.registerTool` when they visit your page.

For a production website:

- Use Chrome 149 or later and enroll your site's origin in the
  [WebMCP origin trial](https://developer.chrome.com/origintrials/#/register_trial/4163014905550602241).
- Serve the page over HTTPS and keep it origin-isolated. Do not opt out with
  `Origin-Agent-Cluster: ?0`.
- Register tools in the top-level document or a same-origin iframe. A
  cross-origin iframe also requires
  `<iframe src="https://example.com" allow="tools"></iframe>` for registration;
  discovering its tools from another origin additionally requires `exposedTo`.

For local development only, enable `chrome://flags/#enable-webmcp-testing` and
restart Chrome. The flag does not enable WebMCP for your site's visitors. See
the [Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) and the
[WebMCP specification](https://webmachinelearning.github.io/webmcp/).

## Security and privacy

- Both tools are marked read-only and identify retrieved content as untrusted.
- Search terms, requested URLs, and an anonymous per-tab session ID are sent to
  `https://search.parallel.ai/mcp`. The referrer includes only your site's
  origin, not its path or query string. URL fragments and browser credentials are
  never sent.
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
