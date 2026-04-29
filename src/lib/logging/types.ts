export type McaLogLevel = "info" | "warn" | "error" | "event" | "timing";

/**
 * Unified structured log envelope (Phase 46).
 * `name` is a dot-separated event key (e.g. `deck.search.interaction`).
 */
export type McaLogEnvelope = {
  level: McaLogLevel;
  name: string;
  data: Record<string, unknown>;
  ts: number;
  componentName: string;
  surfaceName: string;
  traceId?: string;
};

export type McaLogContext = {
  componentName: string;
  surfaceName: string;
  traceId?: string;
};
