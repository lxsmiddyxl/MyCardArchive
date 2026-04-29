/**
 * Lightweight fixed-window rate limiter (in-memory).
 * Suitable for single Node processes; serverless instances each maintain their own window.
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export type RateLimitOptions = {
  /** Max requests per window */
  max: number;
  /** Window length in ms */
  windowMs: number;
};

export function checkRateLimit(key: string, opts: RateLimitOptions): boolean {
  const now = Date.now();
  const b = store.get(key);
  if (!b || now >= b.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }
  if (b.count < opts.max) {
    b.count += 1;
    return true;
  }
  return false;
}

export function rateLimitHeaders(resetAt: number): Record<string, string> {
  const retry = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return {
    "Retry-After": String(retry),
  };
}

/** Best-effort cleanup to avoid unbounded Map growth (optional periodic call). */
export function pruneRateLimitStore(maxAgeMs = 600_000): void {
  const now = Date.now();
  for (const [k, v] of store.entries()) {
    if (now > v.resetAt + maxAgeMs) store.delete(k);
  }
}

/** Max observed count per bucket prefix (e.g. `deck-mut`) across client keys, for health / diagnostics. */
export function getRateLimitBucketStats(
  buckets: ReadonlyArray<{ suffix: string; max: number }>
): Record<string, { used: number; limit: number }> {
  const out: Record<string, { used: number; limit: number }> = {};
  for (const b of buckets) {
    let maxUsed = 0;
    const prefix = `${b.suffix}:`;
    for (const [key, bucket] of store.entries()) {
      if (key.startsWith(prefix)) {
        maxUsed = Math.max(maxUsed, bucket.count);
      }
    }
    out[b.suffix] = { used: maxUsed, limit: b.max };
  }
  return out;
}
