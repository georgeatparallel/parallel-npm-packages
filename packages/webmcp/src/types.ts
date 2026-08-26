export type ParallelWebMcpToolName =
  | 'parallel_web_search'
  | 'parallel_web_fetch';

export interface ParallelWebMcpSource {
  url: string;
  title: string | null;
  publish_date: string | null;
  excerpts: string[];
}

export interface ParallelWebMcpResult {
  request_id: string;
  results: ParallelWebMcpSource[];
  truncated: boolean;
  errors?: Array<{ url: string; error_type: string }>;
}

export interface ParallelWebMcpInstallation {
  readonly supported: boolean;
  readonly tools: readonly ParallelWebMcpToolName[];
  dispose(): void;
}

export interface WebMcpToolDescriptor {
  name: ParallelWebMcpToolName;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: true;
    untrustedContentHint: true;
  };
  execute(
    input: Record<string, unknown>,
    options?: { signal?: AbortSignal }
  ): Promise<ParallelWebMcpResult>;
}

export interface WebMcpModelContext {
  registerTool(
    tool: WebMcpToolDescriptor,
    options?: { signal?: AbortSignal }
  ): void | Promise<void>;
  unregisterTool?(name: string): void;
}

export type WebMcpDocument = Document & {
  modelContext?: WebMcpModelContext;
};
