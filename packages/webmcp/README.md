# Parallel WebMCP

Give AI agents visiting your website free access to Parallel's public-web
search and webpage extraction tools.

The package registers two read-only, namespaced website tools:

- `parallel_web_search` searches the public web.
- `parallel_web_fetch` reads focused excerpts from one public webpage.

Both tools use the existing
[Parallel Search MCP](https://docs.parallel.ai/integrations/mcp/search-mcp)
anonymously. There are no runtime dependencies, API keys, additional servers,
or changes to your website's normal experience.

## Install

Once the package has been published:

```bash
npm install @parallel-web/webmcp@rc
```

Register the tools once from your application's browser entry point:

```ts
import { installParallelWebMcp } from '@parallel-web/webmcp';

const installation = await installParallelWebMcp();

if (installation.supported) {
  console.log('Available website tools:', installation.tools);
}

// Remove only the tools registered by this installation.
installation.dispose();
```

In a real application, call `dispose()` only when the application or its owning
component unmounts. Importing the package during server-side rendering is safe.
Browsers without `document.modelContext.registerTool` do nothing and make no
network requests.

### Script tag

After publication, a version-pinned self-installing module can also be loaded
from an npm CDN:

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/npm/@parallel-web/webmcp@0.1.0-rc.0/dist/auto.js"
  crossorigin="anonymous"
></script>
```

Pin an exact published version and verify the CDN URL before deploying it.
Sites that cannot allow an external script can bundle or self-host the same
module instead.

### React

Install once in a client-side component without adding a React dependency to the
package:

```tsx
import { useEffect } from 'react';
import { installParallelWebMcp } from '@parallel-web/webmcp';

export function ParallelWebsiteTools() {
  useEffect(() => {
    let mounted = true;
    let dispose: (() => void) | undefined;

    void installParallelWebMcp().then((installation) => {
      if (!mounted) {
        installation.dispose();
        return;
      }

      dispose = () => installation.dispose();
    });

    return () => {
      mounted = false;
      dispose?.();
    };
  }, []);

  return null;
}
```

## Browser support

WebMCP is a proposed browser standard. The page must run in a browser that
exposes `document.modelContext.registerTool`, and an agent must visit the page
to discover its tools. Tools disappear when the page is closed or navigated
away from.

For local Chrome development, enable
`chrome://flags/#enable-webmcp-testing`. Production availability may require
Chrome's WebMCP origin trial. Cross-origin iframes also need permission to
register tools. See the
[Chrome WebMCP guide](https://developer.chrome.com/docs/ai/webmcp) and the
[WebMCP specification](https://webmachinelearning.github.io/webmcp/).

## Security and privacy

- Both tools are marked read-only and explicitly label retrieved content as
  untrusted.
- Search terms and requested public URLs are sent to
  `https://search.parallel.ai/mcp`.
- Requests use a stable, per-tab, same-origin session identifier. They do not
  send browser credentials or expose the session identifier as an agent input.
- Fetching is limited to public HTTP or HTTPS URLs and excerpt-sized results.
- Website content, signed-in user data, cookies, DOM state, and agent history
  are never collected automatically.
- Unsupported browsers do not register tools or contact Parallel.
- Requests respect agent cancellation and do not retry free-tier rate-limit
  errors automatically.

If your site uses a Content Security Policy, allow the Search MCP endpoint:

```text
connect-src https://search.parallel.ai
```

The optional CDN script also needs its CDN origin in `script-src`. Never relax
the policy with `unsafe-inline` or a wildcard just for this integration.

Do not put a Parallel API key or bearer token in browser code. Production or
paid usage should go through your own authenticated, same-origin server, which
keeps its Parallel credentials server-side.

## Development

From the monorepo root:

```bash
pnpm --filter @parallel-web/webmcp typecheck
pnpm --filter @parallel-web/webmcp test
pnpm --filter @parallel-web/webmcp build
```
