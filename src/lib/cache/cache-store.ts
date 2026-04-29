import "server-only";

import { getLoadState } from "@/lib/load/load-state";

type Entry = { value: unknown; expiresAt: number };

const MAX_KEYS = 200;
const store = new Map<string, Entry>();

let hits = 0;
let misses = 0;
let evictions = 0;

export function getCacheStats(): { hits: number; misses: number; evictions: number; size: number } {
  return { hits, misses, evictions, size: store.size };
}

export function resetCacheStatsForTests(): void {
  hits = 0;
  misses = 0;
  evictions = 0;
}

export function getCache(key: string): unknown | undefined {
  const e = store.get(key);
  if (!e) {
    misses++;
    return undefined;
  }
  if (Date.now() > e.expiresAt) {
    store.delete(key);
    misses++;
    return undefined;
  }
  hits++;
  store.delete(key);
  store.set(key, e);
  return e.value;
}

export function setCache(key: string, value: unknown, ttlMs: number): void {
  const ttl = Math.max(100, Math.min(ttlMs, 300_000));
  while (store.size >= MAX_KEYS && !store.has(key)) {
    const first = store.keys().next().value as string | undefined;
    if (!first) break;
    store.delete(first);
    evictions++;
  }
  store.set(key, { value, expiresAt: Date.now() + ttl });
}

export function invalidateCache(key: string): void {
  store.delete(key);
}

export function invalidateCachePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}

/** When load is high, prefer fresher data (shorter TTL). */
export function getEffectiveCacheTtlMs(baseTtlMs: number): number {
  const load = getLoadState();
  if (load === "critical") return Math.round(baseTtlMs * 0.65);
  if (load === "high") return Math.round(baseTtlMs * 0.8);
  if (load === "elevated") return Math.round(baseTtlMs * 0.9);
  return baseTtlMs;
}

export function isCacheEnabled(): boolean {
  return process.env.CACHE_ENABLED !== "0";
}
