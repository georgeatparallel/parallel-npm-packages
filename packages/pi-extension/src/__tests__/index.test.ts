import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runParallelCli: vi.fn(),
  runParallelCliJson: vi.fn(),
}));

vi.mock('../parallel-cli.js', () => ({
  runParallelCli: mocks.runParallelCli,
  runParallelCliJson: mocks.runParallelCliJson,
}));

type MockPi = {
  on: ReturnType<typeof vi.fn>;
  registerCommand: ReturnType<typeof vi.fn>;
  registerTool: ReturnType<typeof vi.fn>;
};

function createMockPi(): MockPi {
  return {
    on: vi.fn(),
    registerCommand: vi.fn(),
    registerTool: vi.fn(),
  };
}

function getRegisteredCommand(pi: MockPi, name: string) {
  return pi.registerCommand.mock.calls.find(
    ([commandName]) => commandName === name
  )?.[1];
}

function getEventHandler(pi: MockPi, eventName: string) {
  return pi.on.mock.calls.find(([name]) => name === eventName)?.[1];
}

function getRegisteredTool(pi: MockPi, name: string) {
  return pi.registerTool.mock.calls
    .map(([tool]) => tool)
    .find((tool) => tool.name === name);
}

function createToolContext(overrides: Record<string, unknown> = {}) {
  return {
    hasUI: false,
    ui: {
      confirm: vi.fn(),
      notify: vi.fn(),
    },
    ...overrides,
  } as any;
}

describe('@parallel-web/pi-extension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PARALLEL_API_KEY;
  });

  it('should export the extension as default', async () => {
    const module = await import('../index.js');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('should register the login command and web tools', async () => {
    const extension = (await import('../index.js')).default;
    const pi = createMockPi();

    extension(pi as any);

    expect(pi.registerCommand).toHaveBeenCalledTimes(1);
    expect(pi.registerCommand).toHaveBeenCalledWith(
      'parallel-login',
      expect.objectContaining({
        description: 'Run parallel-cli login for browser/device authentication',
        handler: expect.any(Function),
      })
    );

    expect(pi.registerTool).toHaveBeenCalledTimes(2);

    const searchTool = getRegisteredTool(pi, 'web_search');
    expect(searchTool).toEqual(
      expect.objectContaining({
        name: 'web_search',
        label: 'Web Search',
        description: expect.stringContaining("Parallel's Search API"),
        promptSnippet: expect.stringContaining("Parallel's Search API"),
        promptGuidelines: [
          'Use web_search when the user asks for current web information, discovery, or source finding.',
        ],
        execute: expect.any(Function),
      })
    );

    const fetchTool = getRegisteredTool(pi, 'web_fetch');
    expect(fetchTool).toEqual(
      expect.objectContaining({
        name: 'web_fetch',
        label: 'Web Fetch',
        description: expect.stringContaining("Parallel's Extract API"),
        promptSnippet: expect.stringContaining("Parallel's Extract API"),
        promptGuidelines: [
          'Use web_fetch when the user provides a URL and wants the page content or a clean extraction.',
        ],
        execute: expect.any(Function),
      })
    );
  });

  it('should append web grounding guidance to the system prompt when web tools are active', async () => {
    const extension = (await import('../index.js')).default;
    const pi = createMockPi();
    extension(pi as any);

    const handler = getEventHandler(pi, 'before_agent_start');
    const result = await handler({
      systemPrompt: 'Base system prompt',
      systemPromptOptions: {
        selectedTools: ['web_search', 'read'],
      },
    });

    expect(result).toEqual({
      systemPrompt: expect.stringContaining('Base system prompt'),
    });
    expect(result.systemPrompt).toContain('Grounding and web usage');
    expect(result.systemPrompt).toContain(
      'Do not shy away from using web_search'
    );
    expect(result.systemPrompt).toContain(
      'Do not shy away from using web_fetch'
    );
  });

  it('parallel-login should run cli login and notify on success', async () => {
    process.env.PARALLEL_API_KEY = 'test-api-key';
    mocks.runParallelCli.mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });

    const extension = (await import('../index.js')).default;
    const pi = createMockPi();
    extension(pi as any);

    const command = getRegisteredCommand(pi, 'parallel-login');
    const ctx = createToolContext();

    await command.handler([], ctx);

    expect(mocks.runParallelCli).toHaveBeenCalledWith(['login'], {
      env: { PARALLEL_API_KEY: 'test-api-key' },
      inheritStdio: true,
    });
    expect(ctx.ui.notify).toHaveBeenCalledWith(
      'parallel-cli login completed.',
      'info'
    );
  });

  it('parallel-login should throw when cli login fails', async () => {
    mocks.runParallelCli.mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'failed',
    });

    const extension = (await import('../index.js')).default;
    const pi = createMockPi();
    extension(pi as any);

    const command = getRegisteredCommand(pi, 'parallel-login');

    await expect(command.handler([], createToolContext())).rejects.toThrow(
      'parallel-cli login failed.'
    );
  });

  it('web_search should call the cli and return formatted results', async () => {
    process.env.PARALLEL_API_KEY = 'test-api-key';
    const response = { results: [{ title: 'Example' }] };
    mocks.runParallelCliJson.mockResolvedValue(response);

    const extension = (await import('../index.js')).default;
    const pi = createMockPi();
    extension(pi as any);

    const searchTool = getRegisteredTool(pi, 'web_search');
    const result = await searchTool.execute(
      'tool-call-id',
      {
        objective: 'Find current AI news',
        search_queries: ['ai news', 'llm updates'],
      },
      undefined,
      undefined,
      createToolContext()
    );

    expect(mocks.runParallelCliJson).toHaveBeenCalledWith(
      [
        'search',
        'Find current AI news',
        '--mode',
        'one-shot',
        '--json',
        '-q',
        'ai news',
        '-q',
        'llm updates',
      ],
      {
        env: { PARALLEL_API_KEY: 'test-api-key' },
      }
    );

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
      details: {
        provider: 'parallel',
        product: 'search',
      },
    });
  });

  it('web_search should prompt for auth, login, and retry on auth failures when UI is available', async () => {
    process.env.PARALLEL_API_KEY = 'test-api-key';
    const authError = new Error(
      'parallel-cli search failed (exit 3). Run `parallel-cli login` or set PARALLEL_API_KEY.'
    );

    mocks.runParallelCliJson
      .mockRejectedValueOnce(authError)
      .mockResolvedValueOnce({ ok: true });
    mocks.runParallelCli.mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });

    const extension = (await import('../index.js')).default;
    const pi = createMockPi();
    extension(pi as any);

    const searchTool = getRegisteredTool(pi, 'web_search');
    const ctx = createToolContext({
      hasUI: true,
      ui: {
        confirm: vi.fn().mockResolvedValue(true),
        notify: vi.fn(),
      },
    });

    const result = await searchTool.execute(
      'tool-call-id',
      { objective: 'Find docs' },
      undefined,
      undefined,
      ctx
    );

    expect(ctx.ui.confirm).toHaveBeenCalledWith(
      'Parallel authentication required',
      'This tool needs Parallel auth. Run `parallel-cli login` now?'
    );
    expect(mocks.runParallelCli).toHaveBeenCalledWith(['login'], {
      env: { PARALLEL_API_KEY: 'test-api-key' },
      inheritStdio: true,
    });
    expect(mocks.runParallelCliJson).toHaveBeenCalledTimes(2);
    expect(result.content[0].text).toBe(JSON.stringify({ ok: true }, null, 2));
  });

  it('web_search should rethrow auth failures when the user declines login', async () => {
    const authError = new Error(
      'Run `parallel-cli login` or set PARALLEL_API_KEY.'
    );
    mocks.runParallelCliJson.mockRejectedValue(authError);

    const extension = (await import('../index.js')).default;
    const pi = createMockPi();
    extension(pi as any);

    const searchTool = getRegisteredTool(pi, 'web_search');
    const ctx = createToolContext({
      hasUI: true,
      ui: {
        confirm: vi.fn().mockResolvedValue(false),
        notify: vi.fn(),
      },
    });

    await expect(
      searchTool.execute(
        'tool-call-id',
        { objective: 'Find docs' },
        undefined,
        undefined,
        ctx
      )
    ).rejects.toThrow(authError.message);

    expect(ctx.ui.confirm).toHaveBeenCalled();
    expect(mocks.runParallelCli).not.toHaveBeenCalled();
  });

  it('web_fetch should include the objective when provided', async () => {
    const response = { url: 'https://parallel.ai/docs' };
    mocks.runParallelCliJson.mockResolvedValue(response);

    const extension = (await import('../index.js')).default;
    const pi = createMockPi();
    extension(pi as any);

    const fetchTool = getRegisteredTool(pi, 'web_fetch');
    const result = await fetchTool.execute(
      'tool-call-id',
      {
        url: 'https://parallel.ai/docs',
        objective: 'Summarize the authentication flow',
      },
      undefined,
      undefined,
      createToolContext()
    );

    expect(mocks.runParallelCliJson).toHaveBeenCalledWith(
      [
        'extract',
        'https://parallel.ai/docs',
        '--json',
        '--objective',
        'Summarize the authentication flow',
        '--full-content',
      ],
      {
        env: { PARALLEL_API_KEY: undefined },
      }
    );
    expect(result.details).toEqual({
      provider: 'parallel',
      product: 'extract',
      url: 'https://parallel.ai/docs',
    });
  });

  it('web_fetch should use --no-excerpts when no objective is provided', async () => {
    mocks.runParallelCliJson.mockResolvedValue({ ok: true });

    const extension = (await import('../index.js')).default;
    const pi = createMockPi();
    extension(pi as any);

    const fetchTool = getRegisteredTool(pi, 'web_fetch');
    await fetchTool.execute(
      'tool-call-id',
      { url: 'https://parallel.ai/docs' },
      undefined,
      undefined,
      createToolContext()
    );

    expect(mocks.runParallelCliJson).toHaveBeenCalledWith(
      [
        'extract',
        'https://parallel.ai/docs',
        '--json',
        '--no-excerpts',
        '--full-content',
      ],
      {
        env: { PARALLEL_API_KEY: undefined },
      }
    );
  });

  it('tool results should be truncated when the cli returns large JSON payloads', async () => {
    const largeResponse = {
      items: Array.from({ length: 5000 }, (_, index) => `result-${index}`),
    };
    mocks.runParallelCliJson.mockResolvedValue(largeResponse);

    const extension = (await import('../index.js')).default;
    const pi = createMockPi();
    extension(pi as any);

    const searchTool = getRegisteredTool(pi, 'web_search');
    const result = await searchTool.execute(
      'tool-call-id',
      { objective: 'Find many results' },
      undefined,
      undefined,
      createToolContext()
    );

    expect(result.content[0].text).toContain('[Output truncated: showing');
  });
});
