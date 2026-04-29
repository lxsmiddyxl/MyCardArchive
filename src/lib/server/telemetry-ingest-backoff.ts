import "server-only";

/** Simple exponential-ish backoff for ingest recovery (in-memory, per instance). */
let backoffUntil = 0;
let failureStreak = 0;

export function resetIngestBackoff(): void {
  backoffUntil = 0;
  failureStreak = 0;
}

export function registerIngestFailure(): void {
  failureStreak = Math.min(failureStreak + 1, 8);
  const delay = Math.min(60_000, 500 * 2 ** failureStreak);
  backoffUntil = Date.now() + delay;
}

export function registerIngestSuccess(): void {
  failureStreak = 0;
  backoffUntil = 0;
}

export function isIngestBackoffActive(): boolean {
  return Date.now() < backoffUntil;
}

export function getIngestBackoffState(): { until: number; streak: number } {
  return { until: backoffUntil, streak: failureStreak };
}
