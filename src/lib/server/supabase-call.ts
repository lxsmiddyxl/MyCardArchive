import "server-only";

import { logger } from "@/lib/telemetry/logger";

const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_MAX_RETRIES = 2;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message.toLowerCase();
  return (
    m.includes("timeout") ||
    m.includes("fetch") ||
    m.includes("network") ||
    m.includes("econnreset") ||
    m.includes("aborted")
  );
}

/**
 * Runs an async Supabase (or other) call with a wall-clock timeout and limited retries
 * on transient failures. Pair with {@link withQueryTiming} on the outer handler when needed.
 */
export async function withSupabaseCall<T>(
  label: string,
  fn: () => PromiseLike<T>,
  opts?: { timeoutMs?: number; maxRetries?: number }
): Promise<T> {
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts?.maxRetries ?? DEFAULT_MAX_RETRIES;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await Promise.race([
        Promise.resolve(fn()),
        new Promise<never>((_, rej) =>
          setTimeout(
            () => rej(new Error(`supabase_query_timeout:${label}`)),
            timeoutMs
          )
        ),
      ]);
    } catch (e) {
      lastErr = e;
      const retry = attempt < maxRetries && isRetryable(e);
      if (retry) {
        logger.warn({
          eventType: "supabase.query.retry",
          success: false,
          latencyMs: 0,
          payloadSummary: { label, attempt: attempt + 1 },
        });
        await delay(120 * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}
