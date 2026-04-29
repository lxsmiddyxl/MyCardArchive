/**
 * In-memory telemetry aggregation (per-process). Suitable for single-instance or dev/staging;
 * replace with Redis/Prometheus in multi-instance production if needed.
 */

import type { StructuredLogEvent } from "@/lib/telemetry/schema";

type MinuteBucket = {
  minuteKey: number;
  /** eventType -> count */
  counts: Record<string, number>;
  /** eventType -> sum of latencyMs */
  latencySum: Record<string, number>;
  /** eventType -> count of samples with latency */
  latencyCount: Record<string, number>;
  /** eventType -> error count (success === false) */
  errors: Record<string, number>;
};

const buckets = new Map<number, MinuteBucket>();
const RETAIN_MINUTES = 65;

function minuteKeyFromTs(ts: number): number {
  return Math.floor(ts / 60_000);
}

function prune(): void {
  const cutoff = minuteKeyFromTs(Date.now()) - RETAIN_MINUTES;
  for (const k of buckets.keys()) {
    if (k < cutoff) buckets.delete(k);
  }
}

/**
 * Record one structured event into the current minute bucket (idempotent aggregation).
 */
export function recordTelemetryEvent(event: StructuredLogEvent): void {
  prune();
  const mk = minuteKeyFromTs(Date.now());
  let b = buckets.get(mk);
  if (!b) {
    b = { minuteKey: mk, counts: {}, latencySum: {}, latencyCount: {}, errors: {} };
    buckets.set(mk, b);
  }
  const et = event.eventType;
  b.counts[et] = (b.counts[et] ?? 0) + 1;
  if (event.latencyMs != null && Number.isFinite(event.latencyMs)) {
    b.latencySum[et] = (b.latencySum[et] ?? 0) + event.latencyMs;
    b.latencyCount[et] = (b.latencyCount[et] ?? 0) + 1;
  }
  if (!event.success) {
    b.errors[et] = (b.errors[et] ?? 0) + 1;
  }
}

export type TelemetrySnapshot = {
  generatedAt: string;
  /** Per-minute series (oldest → newest), last up to 60 non-empty minutes in window */
  perMinute: Array<{
    minuteStartIso: string;
    counts: Record<string, number>;
    errors: Record<string, number>;
  }>;
  /** Rolled up over retained window */
  totals: {
    counts: Record<string, number>;
    errors: Record<string, number>;
    averageLatencyMsByEvent: Record<string, number>;
    errorRateByEvent: Record<string, number>;
  };
};

function mergeRecord(
  into: Record<string, number>,
  from: Record<string, number>,
  scale: number
): void {
  for (const [k, v] of Object.entries(from)) {
    into[k] = (into[k] ?? 0) + v * scale;
  }
}

export function getTelemetrySnapshot(): TelemetrySnapshot {
  prune();
  const mkNow = minuteKeyFromTs(Date.now());
  const perMinute: TelemetrySnapshot["perMinute"] = [];

  for (let i = 59; i >= 0; i--) {
    const mk = mkNow - i;
    const b = buckets.get(mk);
    if (!b || Object.keys(b.counts).length === 0) continue;
    perMinute.push({
      minuteStartIso: new Date(mk * 60_000).toISOString(),
      counts: { ...b.counts },
      errors: { ...b.errors },
    });
  }

  const counts: Record<string, number> = {};
  const errors: Record<string, number> = {};
  const latencySum: Record<string, number> = {};
  const latencyN: Record<string, number> = {};

  for (const b of buckets.values()) {
    mergeRecord(counts, b.counts, 1);
    mergeRecord(errors, b.errors, 1);
    for (const [et, s] of Object.entries(b.latencySum)) {
      latencySum[et] = (latencySum[et] ?? 0) + s;
    }
    for (const [et, n] of Object.entries(b.latencyCount)) {
      latencyN[et] = (latencyN[et] ?? 0) + n;
    }
  }

  const averageLatencyMsByEvent: Record<string, number> = {};
  for (const et of Object.keys(latencySum)) {
    const n = latencyN[et] ?? 0;
    if (n > 0) averageLatencyMsByEvent[et] = latencySum[et] / n;
  }

  const errorRateByEvent: Record<string, number> = {};
  for (const et of Object.keys(counts)) {
    const c = counts[et] ?? 0;
    const e = errors[et] ?? 0;
    errorRateByEvent[et] = c > 0 ? e / c : 0;
  }

  return {
    generatedAt: new Date().toISOString(),
    perMinute,
    totals: {
      counts,
      errors,
      averageLatencyMsByEvent,
      errorRateByEvent,
    },
  };
}
