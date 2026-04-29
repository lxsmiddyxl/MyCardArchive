import "server-only";

import { logger } from "@/lib/telemetry/logger";

const DEFAULT_SLOW_MS = 450;

/**
 * Wraps async Supabase / DB work to log slow paths (structured telemetry).
 */
export async function withQueryTiming<T>(
  label: string,
  fn: () => Promise<T>,
  slowMs: number = DEFAULT_SLOW_MS
): Promise<T> {
  const t = Date.now();
  try {
    const out = await fn();
    const ms = Date.now() - t;
    if (ms >= slowMs) {
      logger.warn({
        eventType: "supabase.query.slow",
        success: true,
        latencyMs: ms,
        payloadSummary: { label },
      });
    }
    return out;
  } catch (err) {
    const ms = Date.now() - t;
    logger.warn({
      eventType: "supabase.query.error",
      success: false,
      latencyMs: ms,
      payloadSummary: { label, error: err instanceof Error ? err.message : String(err) },
    });
    throw err;
  }
}
