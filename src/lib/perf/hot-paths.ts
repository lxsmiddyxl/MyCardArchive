import "server-only";

import type { HotPathId } from "@/lib/perf/hot-path-ids";
import { isHotPathId } from "@/lib/perf/hot-path-ids";

const RING_MAX = 50;
const rings = new Map<string, number[]>();
const pending = new Map<string, { id: HotPathId; start: number }>();

function ensureRing(id: string): number[] {
  let r = rings.get(id);
  if (!r) {
    r = [];
    rings.set(id, r);
  }
  return r;
}

export function recordHotPathDuration(id: HotPathId, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  const ring = ensureRing(id);
  ring.push(Math.round(durationMs * 100) / 100);
  if (ring.length > RING_MAX) ring.shift();
}

export function ingestHotPathSamples(samples: Array<{ id: string; durationMs: number }>): void {
  for (const s of samples) {
    if (!isHotPathId(s.id)) continue;
    recordHotPathDuration(s.id, s.durationMs);
  }
}

export function markHotPathStart(id: HotPathId): string {
  const token = `${id}::${Date.now()}::${Math.random().toString(36).slice(2, 11)}`;
  pending.set(token, { id, start: performance.now() });
  return token;
}

export function markHotPathEnd(token: string): void {
  const p = pending.get(token);
  if (!p) return;
  pending.delete(token);
  recordHotPathDuration(p.id, performance.now() - p.start);
}

export type HotPathStatEntry = {
  id: HotPathId;
  samples: number;
  p50: number;
  p95: number;
  max: number;
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const pos = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = sorted[lo] ?? 0;
  const b = sorted[hi] ?? a;
  return Math.round((a + (b - a) * (pos - lo)) * 100) / 100;
}

export function getHotPathStats(): HotPathStatEntry[] {
  const out: HotPathStatEntry[] = [];
  for (const [id, ring] of rings.entries()) {
    if (!isHotPathId(id)) continue;
    if (ring.length === 0) continue;
    const sorted = [...ring].sort((a, b) => a - b);
    out.push({
      id,
      samples: ring.length,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      max: sorted[sorted.length - 1] ?? 0,
    });
  }
  return out;
}

export function resetHotPathsForTests(): void {
  rings.clear();
  pending.clear();
}
