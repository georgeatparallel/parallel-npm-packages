# @parallel-web/opencode-plugin

OpenCode plugin that adds `parallel-search` and `parallel-fetch` tools powered by [Parallel Web](https://parallel.ai) through `parallel-cli`.

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

**Option A: Parallel CLI login (recommended)**

1. Run `opencode auth login`
2. Select **"Parallel"** → **"Login with Parallel CLI"** OR **Input API key from platform.parallel.ai**
3. Complete authorization in your browser/device flow


**Option B: Environment variable* *

```bash
export PARALLEL_API_KEY=your_api_key
```

Get your API key at [platform.parallel.ai](https://platform.parallel.ai).

The plugin invokes `parallel-cli` under the hood for both tools.

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

## License

MIT
