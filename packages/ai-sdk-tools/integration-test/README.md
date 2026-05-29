# Integration / e2e harness

A manual harness for exercising `@parallel-web/ai-sdk-tools` against the **real
Parallel API** (and, optionally, a real LLM). It runs against the **locally
built** output in `../dist`, so it tests exactly what would be published.

This is intentionally separate from the Vitest suites (`src/__tests__`): those
either need no network (unit tests) or hit the API directly without an LLM. This
harness adds a real `generateText` tool-calling round-trip on top.

## What it runs

| # | Section | Needs |
|---|---------|-------|
| 1 | `searchTool.execute()` → real `POST /v1/search` | `PARALLEL_API_KEY` |
| 2 | `extractTool.execute()` → real `POST /v1/extract` | `PARALLEL_API_KEY` |
| 3 | `createSearchTool()` with `advanced_settings` | `PARALLEL_API_KEY` |
| 4 | End-to-end LLM tool call via `generateText` | `PARALLEL_API_KEY` + `AI_GATEWAY_API_KEY` |

Section 4 is **optional** and is skipped automatically if `AI_GATEWAY_API_KEY`
is not set. Sections 1–3 fail the run (non-zero exit) if they error.

## Prerequisites

Build the package first — the harness imports from `../dist/index.js`:

```bash
pnpm --filter @parallel-web/ai-sdk-tools build
```

Rebuild whenever you change the source.

## Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PARALLEL_API_KEY` | yes | Parallel API key from [platform.parallel.ai](https://platform.parallel.ai/settings?tab=api-keys) |
| `AI_GATEWAY_API_KEY` | only for section 4 | [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) key. AI SDK v6 resolves a plain model string (e.g. `google/gemini-3-pro-preview`) through the gateway, so no provider package is needed. |
| `E2E_MODEL` | no | Override the gateway model id (default: `google/gemini-3-pro-preview`). |

## Run it

From the repo root (or anywhere — the script resolves paths relative to itself):

```bash
# fish
set -x PARALLEL_API_KEY pk-...
set -x AI_GATEWAY_API_KEY vck-...   # optional, enables section 4
node packages/ai-sdk-tools/integration-test/run.mjs
```

```bash
# bash / zsh
PARALLEL_API_KEY=pk-... \
AI_GATEWAY_API_KEY=vck-... \
  node packages/ai-sdk-tools/integration-test/run.mjs
```

Search-only smoke test (skips the LLM section):

```bash
PARALLEL_API_KEY=pk-... node packages/ai-sdk-tools/integration-test/run.mjs
```

## Expected output

Each section prints a few fields and an `✓ ok`, ending with:

```
All executed sections passed. ✅
```

If a section throws (bad key, network, schema rejection, etc.) it prints the
stack and the process exits non-zero.
