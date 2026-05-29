#!/usr/bin/env node
/**
 * Manual integration / e2e harness for @parallel-web/ai-sdk-tools.
 *
 * Runs against the LOCAL build output (../dist/index.js), so build the package
 * first:  pnpm --filter @parallel-web/ai-sdk-tools build
 *
 * See ./README.md for the full setup and the environment variables to set.
 *
 * What it covers:
 *   1. searchTool.execute()  -> real v1 POST /v1/search          (needs PARALLEL_API_KEY)
 *   2. extractTool.execute() -> real v1 POST /v1/extract         (needs PARALLEL_API_KEY)
 *   3. createSearchTool() with advanced_settings                 (needs PARALLEL_API_KEY)
 *   4. End-to-end LLM tool call via generateText                 (needs PARALLEL_API_KEY + AI_GATEWAY_API_KEY)
 */

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(here, '../dist/index.js');

function fail(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

if (!existsSync(distEntry)) {
  fail(
    'Build output not found at ../dist/index.js.\n' +
      '  Build the package first:\n' +
      '    pnpm --filter @parallel-web/ai-sdk-tools build'
  );
}

if (!process.env.PARALLEL_API_KEY) {
  fail('PARALLEL_API_KEY is not set. See ./README.md.');
}

const { searchTool, extractTool, createSearchTool } = await import(distEntry);

// The AI SDK passes a ToolCallOptions object as the 2nd arg to execute().
// We synthesize a minimal one for direct calls (no LLM involved).
const toolOptions = {
  toolCallId: 'integration-test',
  messages: [],
  abortSignal: undefined,
};

function header(title) {
  console.log(`\n=== ${title} ===`);
}

let failures = 0;
async function section(title, fn) {
  header(title);
  try {
    await fn();
    console.log('✓ ok');
  } catch (err) {
    failures++;
    console.error('✗ FAILED');
    console.error(err?.stack ?? err);
  }
}

await section('1. searchTool.execute() — real v1 /search', async () => {
  const res = await searchTool.execute(
    {
      search_queries: ['Parallel web search API'],
      objective: 'What does Parallel offer for web search?',
      mode: 'advanced',
    },
    toolOptions
  );
  console.log('search_id :', res.search_id);
  console.log('session_id:', res.session_id);
  console.log('results   :', res.results.length);
  console.log('first url :', res.results[0]?.url);
});

await section('2. extractTool.execute() — real v1 /extract', async () => {
  const res = await extractTool.execute(
    {
      urls: ['https://parallel.ai'],
      objective: 'What products does Parallel offer?',
    },
    toolOptions
  );
  console.log('extract_id:', res.extract_id);
  console.log('session_id:', res.session_id);
  console.log('results   :', res.results.length);
  console.log('errors    :', res.errors.length);
  console.log('first url :', res.results[0]?.url);
});

await section('3. createSearchTool() with advanced_settings', async () => {
  const tool = createSearchTool({ mode: 'basic', max_results: 3 });
  const res = await tool.execute(
    { search_queries: ['Vercel AI SDK tool calling'] },
    toolOptions
  );
  console.log('results   :', res.results.length, '(requested max_results: 3)');
});

await section('4. End-to-end via LLM (generateText)', async () => {
  // AI SDK v6 resolves a plain model string through the built-in AI Gateway,
  // which authenticates with AI_GATEWAY_API_KEY. No provider package needed.
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.log(
      '• Skipped: AI_GATEWAY_API_KEY not set (this section is optional).'
    );
    return;
  }

  const { generateText, stepCountIs } = await import('ai');
  const model = process.env.E2E_MODEL ?? 'google/gemini-3-pro-preview';

  const res = await generateText({
    model,
    prompt: 'When was Vercel Ship AI?',
    tools: {
      webSearch: searchTool,
      webExtract: extractTool,
    },
    stopWhen: stepCountIs(3),
  });

  const toolCalls = res.steps.flatMap((s) => s.toolCalls ?? []);
  console.log('model     :', model);
  console.log(
    'tool calls:',
    toolCalls.map((c) => c.toolName)
  );
  console.log('answer    :', res.text);
});

if (failures > 0) {
  fail(`${failures} section(s) failed.`);
}
console.log('\nAll executed sections passed. ✅');
