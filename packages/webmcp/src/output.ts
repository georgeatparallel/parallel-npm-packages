import type { ParallelWebMcpResult, ParallelWebMcpSource } from './types.js';

export const MAX_OUTPUT_BYTES = 12_000;
const MAX_RESULTS = 5;
const MAX_ERRORS = 3;
const encoder = new TextEncoder();

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function outputBytes(output: ParallelWebMcpResult): number {
  return encoder.encode(JSON.stringify(output)).byteLength;
}

function normalizeSource(value: unknown): ParallelWebMcpSource | undefined {
  const result = asRecord(value);
  if (!result || typeof result.url !== 'string' || result.url.length > 2_048) {
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(result.url);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;

  return {
    url: result.url,
    title: typeof result.title === 'string' ? result.title.slice(0, 200) : null,
    publish_date:
      typeof result.publish_date === 'string'
        ? result.publish_date.slice(0, 32)
        : null,
    excerpts: [],
  };
}

function appendBoundedExcerpt(
  output: ParallelWebMcpResult,
  source: ParallelWebMcpSource,
  excerpt: string
): boolean {
  source.excerpts.push(excerpt);
  if (outputBytes(output) <= MAX_OUTPUT_BYTES) return true;

  source.excerpts.pop();
  output.truncated = true;

  const characters = Array.from(excerpt);
  let low = 0;
  let high = characters.length;

  while (low < high) {
    const midpoint = Math.ceil((low + high) / 2);
    source.excerpts.push(characters.slice(0, midpoint).join(''));
    const fits = outputBytes(output) <= MAX_OUTPUT_BYTES;
    source.excerpts.pop();

    if (fits) low = midpoint;
    else high = midpoint - 1;
  }

  if (low > 0) source.excerpts.push(characters.slice(0, low).join(''));
  return false;
}

export function normalizeOutput(
  payload: unknown,
  remoteTool: 'web_search' | 'web_fetch'
): ParallelWebMcpResult {
  const data = asRecord(payload);
  const requestId =
    data?.[remoteTool === 'web_search' ? 'search_id' : 'extract_id'];

  if (!data || typeof requestId !== 'string' || !Array.isArray(data.results)) {
    throw new Error('Parallel Search returned an unexpected response.');
  }

  const candidates = data.results
    .map((value) => ({
      value: asRecord(value),
      source: normalizeSource(value),
    }))
    .filter(
      (
        candidate
      ): candidate is {
        value: Record<string, unknown>;
        source: ParallelWebMcpSource;
      } => candidate.value !== undefined && candidate.source !== undefined
    );

  const output: ParallelWebMcpResult = {
    request_id: requestId.slice(0, 100),
    results: candidates.slice(0, MAX_RESULTS).map(({ source }) => source),
    truncated:
      candidates.length > MAX_RESULTS ||
      candidates.length !== data.results.length,
  };

  if (remoteTool === 'web_fetch' && Array.isArray(data.errors)) {
    const errors = data.errors
      .map(asRecord)
      .filter(
        (error): error is Record<string, unknown> =>
          error !== undefined &&
          typeof error.url === 'string' &&
          typeof error.error_type === 'string'
      )
      .slice(0, MAX_ERRORS)
      .map((error) => ({
        url: (error.url as string).slice(0, 2_048),
        error_type: (error.error_type as string).slice(0, 100),
      }));
    if (errors.length > 0) output.errors = errors;
    if (data.errors.length > errors.length) output.truncated = true;
  }

  while (outputBytes(output) > MAX_OUTPUT_BYTES && output.errors?.length) {
    output.errors.pop();
    output.truncated = true;
    if (output.errors.length === 0) delete output.errors;
  }

  while (outputBytes(output) > MAX_OUTPUT_BYTES && output.results.length > 0) {
    output.results.pop();
    output.truncated = true;
  }

  for (let index = 0; index < output.results.length; index += 1) {
    const excerpts = candidates[index]?.value.excerpts;
    if (!Array.isArray(excerpts)) continue;

    for (const excerpt of excerpts) {
      if (typeof excerpt !== 'string') {
        output.truncated = true;
        continue;
      }
      if (!appendBoundedExcerpt(output, output.results[index], excerpt)) {
        break;
      }
    }
  }

  return output;
}
