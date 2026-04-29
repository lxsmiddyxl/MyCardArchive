export type DiagnosticResult = {
  name: string;
  ok: boolean;
  data?: unknown;
  ts: number;
};

export type DiagnosticFn = () => Promise<{ ok: boolean; data?: unknown }>;
