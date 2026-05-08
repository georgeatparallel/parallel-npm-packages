# @parallel-web/pi-extension

Pi extension that adds `web_search` and `web_fetch` backed by Parallel.

Install it with:
```
pi install npm:@parallel-web/pi-extension
```

## What It Does

- Registers `web_search`
- Registers `web_fetch`
- Adds a `parallel-login` command for browser auth
- Stores the resulting Parallel API key in Pi's auth store

Auth resolution order:

1. Stored Pi auth for provider key `parallel`
2. `PARALLEL_API_KEY`

## Dogfooding Locally

Build the extension first:

```bash
pnpm --filter @parallel-web/pi-extension build
```

### Option 1: Load It Directly With `pi -e`

This is the fastest way to test a local checkout.

From the repo root:

```bash
pi --no-extensions --no-skills -e ./packages/pi-extension/dist/index.js
```

If the extension loads successfully, Pi will have:

- the `web_search` tool
- the `web_fetch` tool
- the `parallel-login` command
- per-session Parallel `session_id` reuse inside that Pi session

### Option 2: Symlink It Into Pi Extensions

This is better if you want Pi to auto-discover it and support `/reload`.

First build it:

```bash
pnpm --filter @parallel-web/pi-extension build
```

Then symlink the package directory into Pi's global extensions folder:

```bash
mkdir -p ~/.pi/agent/extensions
ln -s \
  parallel-npm-packages/packages/pi-extension \
  ~/.pi/agent/extensions/parallel-pi-extension
```

Then start Pi normally:

```bash
pi
```

After code changes, rebuild and run `/reload` inside Pi:

```bash
pnpm --filter @parallel-web/pi-extension build
```

## Local Auth Testing

### Use Stored Pi Auth

Inside Pi, run:

```text
/parallel-login
```

That opens the browser for Parallel OAuth. On success, the API key is stored in Pi auth under `parallel`.

### Use Environment Variable Instead

```bash
export PARALLEL_API_KEY=your_key_here
pi --no-extensions --no-skills -e ./packages/pi-extension/dist/index.js
```

Note: stored Pi auth is preferred over `PARALLEL_API_KEY` if both exist.

### Override The OAuth Platform URL

For local or staging OAuth testing, set `PARALLEL_PLATFORM_URL` before starting Pi:

```bash
export PARALLEL_PLATFORM_URL=https://your-platform-host
pi --no-extensions --no-skills -e ./packages/pi-extension/dist/index.js
```

This changes the browser login endpoints used by `parallel-login` and on-demand auth.

## Quick Smoke Test

Once Pi is running with the extension loaded, ask something that should force web usage, for example:

```text
Search the web for the latest Parallel docs on OAuth and summarize them.
```

Or ask Pi to call the tool explicitly.

`web_search` requires `search_queries`.

`web_fetch` accepts multiple URLs in a single call, so the agent can batch extraction work instead of parallelizing many single-URL requests.

## Dev Loop

```bash
pnpm --filter @parallel-web/pi-extension build
pnpm --filter @parallel-web/pi-extension test
pnpm --filter @parallel-web/pi-extension typecheck
```

## Notes

- The extension uses the `parallel-web` TypeScript SDK directly.
- Search requests use Parallel SDK `basic` mode.
- Search requests include `client_model` when Pi has an active model selected.
- Search and extract requests reuse a generated `session_id` for the life of the current Pi session.
- The login flow tries to open your browser automatically.
- If automatic callback capture does not complete, the extension falls back to asking you to paste the callback URL.
- Skill suppression inside the extension is prompt-level only. If you want a clean dogfooding session without your usual skills list, start Pi with `--no-skills`.
