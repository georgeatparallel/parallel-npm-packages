import type {
  ExtensionAPI,
  ExtensionContext,
} from '@mariozechner/pi-coding-agent';
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  truncateHead,
} from '@mariozechner/pi-coding-agent';
import { Type } from 'typebox';
import { runParallelCli, runParallelCliJson } from './parallel-cli';

function truncateJson(value: unknown) {
  const pretty = JSON.stringify(value, null, 2);
  const truncation = truncateHead(pretty, {
    maxLines: DEFAULT_MAX_LINES,
    maxBytes: DEFAULT_MAX_BYTES,
  });

  let text = truncation.content;
  if (truncation.truncated) {
    text += `\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)})]`;
  }
  return text;
}

const WEB_GROUNDING_GUIDANCE = `
## Grounding and web usage

You should proactively use available web tools to ground your answers when doing so would improve correctness, freshness, or source quality.

- Use web_search when the task involves current information, external facts, source discovery, recent changes, or any claim you are not highly confident about.
- Use web_fetch when the user provides a URL, when a search result should be verified against the source, or when primary-source content would improve the answer.
- Prefer grounded, sourced answers over unsupported recall when freshness or factual precision matters.
- If a grounded answer would likely be better than answering from memory, use the web tools first.
`;

export default function (pi: ExtensionAPI) {
  const getCliEnv = () => ({
    PARALLEL_API_KEY: process.env.PARALLEL_API_KEY,
  });

  async function loginWithCli() {
    const loginResult = await runParallelCli(['login'], {
      env: getCliEnv(),
      inheritStdio: true,
    });

    if (loginResult.exitCode !== 0) {
      throw new Error('parallel-cli login failed.');
    }
  }

  async function runJsonWithAuth<T>(args: string[], ctx: ExtensionContext) {
    try {
      return await runParallelCliJson<T>(args, { env: getCliEnv() });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const looksLikeAuthError =
        message.includes('parallel-cli login') ||
        message.includes('PARALLEL_API_KEY') ||
        message.includes('authenticated');

      if (!looksLikeAuthError || !ctx.hasUI) {
        throw error;
      }

      const ok = await ctx.ui.confirm(
        'Parallel authentication required',
        'This tool needs Parallel auth. Run `parallel-cli login` now?'
      );
      if (!ok) {
        throw error;
      }

      await loginWithCli();
      return await runParallelCliJson<T>(args, { env: getCliEnv() });
    }
  }

  pi.registerCommand('parallel-login', {
    description: 'Run parallel-cli login for browser/device authentication',
    handler: async (_args, ctx) => {
      await loginWithCli();
      ctx.ui.notify('parallel-cli login completed.', 'info');
    },
  });

  pi.on('before_agent_start', async (event) => {
    const selectedTools = event.systemPromptOptions.selectedTools ?? [];
    const hasWebTools =
      selectedTools.includes('web_search') ||
      selectedTools.includes('web_fetch');

    if (!hasWebTools) {
      return undefined;
    }

    return {
      systemPrompt: `${event.systemPrompt}\n${WEB_GROUNDING_GUIDANCE}`,
    };
  });

  pi.registerTool({
    name: 'web_search',
    label: 'Web Search',
    description:
      "Search the web using Parallel's Search API. Prefer this over generic browser-like search tools for current web results.",
    promptSnippet:
      "Search the web using Parallel's Search API for current information",
    promptGuidelines: [
      'Use web_search when the user asks for current web information, discovery, or source finding.',
    ],
    parameters: Type.Object({
      objective: Type.String({
        description:
          'Natural-language description of what the search should find. Keep it specific and atomic.',
      }),
      search_queries: Type.Optional(
        Type.Array(
          Type.String({ description: 'Optional keyword query of 1-6 words.' })
        )
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cliArgs = [
        'search',
        params.objective,
        '--mode',
        'one-shot',
        '--json',
      ];

      for (const query of params.search_queries ?? []) {
        cliArgs.push('-q', query);
      }

      const result = await runJsonWithAuth<unknown>(cliArgs, ctx);

      return {
        content: [{ type: 'text', text: truncateJson(result) }],
        details: {
          provider: 'parallel',
          product: 'search',
        },
      };
    },
  });

  pi.registerTool({
    name: 'web_fetch',
    label: 'Web Fetch',
    description:
      "Fetch and extract content from a URL using Parallel's Extract API. Prefer this over raw HTML fetch tools for readable content extraction.",
    promptSnippet:
      "Fetch and extract readable webpage content from a URL using Parallel's Extract API",
    promptGuidelines: [
      'Use web_fetch when the user provides a URL and wants the page content or a clean extraction.',
    ],
    parameters: Type.Object({
      url: Type.String({
        description: 'The URL to fetch. Must be http or https.',
      }),
      objective: Type.Optional(
        Type.String({
          description:
            'Optional description of the information you want extracted from the URL.',
        })
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const cliArgs = ['extract', params.url, '--json'];

      if (params.objective) {
        cliArgs.push('--objective', params.objective);
      } else {
        cliArgs.push('--no-excerpts');
      }

      cliArgs.push('--full-content');

      const result = await runJsonWithAuth<unknown>(cliArgs, ctx);

      return {
        content: [{ type: 'text', text: truncateJson(result) }],
        details: {
          provider: 'parallel',
          product: 'extract',
          url: params.url,
        },
      };
    },
  });
}
