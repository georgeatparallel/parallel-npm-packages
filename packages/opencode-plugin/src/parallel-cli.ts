import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';

export interface RunParallelCliOptions {
  env?: Record<string, string | undefined>;
  inheritStdio?: boolean;
}

export interface RunParallelCliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

let cachedCliPath: string | undefined;

async function resolveParallelCliPath(): Promise<string> {
  if (cachedCliPath) {
    return cachedCliPath;
  }

  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve('parallel-web-cli/package.json');
  const packageJsonRaw = await readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonRaw) as {
    bin?: string | Record<string, string>;
  };

  const binField = packageJson.bin;
  let binRelativePath: string | undefined;

  if (typeof binField === 'string') {
    binRelativePath = binField;
  } else if (binField && typeof binField['parallel-cli'] === 'string') {
    binRelativePath = binField['parallel-cli'];
  }

  if (!binRelativePath) {
    throw new Error(
      'Could not resolve parallel-cli binary from parallel-web-cli package.'
    );
  }

  cachedCliPath = join(dirname(packageJsonPath), binRelativePath);
  return cachedCliPath;
}

export async function runParallelCli(
  args: string[],
  options: RunParallelCliOptions = {}
): Promise<RunParallelCliResult> {
  const cliPath = await resolveParallelCliPath();

  return new Promise((resolve, reject) => {
    const child = spawn(cliPath, args, {
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: options.inheritStdio ? 'inherit' : 'pipe',
    });

    let stdout = '';
    let stderr = '';

    if (!options.inheritStdio) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (exitCode) => {
      resolve({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

export async function runParallelCliJson<T>(
  args: string[],
  options: RunParallelCliOptions = {}
): Promise<T> {
  const result = await runParallelCli(args, options);

  if (result.exitCode !== 0) {
    const authMessage =
      result.exitCode === 3
        ? 'Run `parallel-cli login` or set PARALLEL_API_KEY.'
        : 'Check that parallel-cli is installed and authenticated.';

    throw new Error(
      `parallel-cli ${args[0] ?? 'command'} failed (exit ${result.exitCode}). ${authMessage}${result.stderr ? `\n${result.stderr.trim()}` : ''}`
    );
  }

  try {
    return JSON.parse(result.stdout) as T;
  } catch (error) {
    throw new Error(
      `parallel-cli returned invalid JSON for ${args[0] ?? 'command'}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
