# @parallel-web/opencode-plugin

OpenCode plugin that adds `parallel-search` and `parallel-fetch` tools powered by [Parallel Web](https://parallel.ai)'s Search and Extract APIs.

**Why use Parallel tools?**

- More accurate and relevant search results
- Intelligent content extraction that understands page structure
- Extended excerpts optimized for LLM context windows
- Faster and more reliable than built-in alternatives

## Installation
### 1. Add the plugin to your OpenCode config

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["@parallel-web/opencode-plugin"]
}
```

### 2. Authenticate

**Option A: Browser login (recommended)**

1. Run `opencode auth login`
2. Select **"Parallel"** → **"Login with Parallel (browser)"**
3. Complete authorization in your browser; the plugin stores the resulting API key in OpenCode's auth store.

Or pick **"Enter API Key manually"** to paste a key from [platform.parallel.ai](https://platform.parallel.ai).

**Option B: Environment variable**

```bash
export PARALLEL_API_KEY=your_api_key
```

Get your API key at [platform.parallel.ai](https://platform.parallel.ai).

## Tools

| Tool              | Description                                         |
| ----------------- | --------------------------------------------------- |
| `parallel-search` | Web search with high-quality, LLM-optimized results |
| `parallel-fetch`  | Intelligent content extraction from any URL         |

### Example parallel-search

```
Search for the latest developments in AI safety research
```

### Example parallel-fetch

```
Fetch https://docs.parallel.ai/api-reference
```

## Local development

OpenCode auto-loads plugins from `~/.config/opencode/plugins/`, so you can test
local changes by building the package and pointing that directory at the build
output with a symlink:

```bash
# from the repo root
pnpm build
ln -sfn "$(pwd)/packages/opencode-plugin/dist" ~/.config/opencode/plugins
```

That leaves `~/.config/opencode/plugins` as a symlink to the plugin's `dist/`:

```
plugins@ -> /Users/you/Software/parallel-npm-packages/packages/opencode-plugin/dist/
```

Restart `opencode` and the plugin loads at startup. Each `pnpm build` is picked
up on the next restart.

## License

MIT
