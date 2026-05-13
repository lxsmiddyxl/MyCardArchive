import "server-only";

import { getEffectiveCacheTtlMs, isCacheEnabled } from "@/lib/cache/cache-store";

function envMs(key: string, fallback: number): number {
  const n = Number(process.env[key]?.trim());
  return Number.isFinite(n) && n >= 1000 && n <= 120_000 ? n : fallback;
}

export function ttlSearchMs(): number {
  return envMs("CACHE_TTL_SEARCH", 22_000);
}

export function ttlCollectionMs(): number {
  return envMs("CACHE_TTL_COLLECTION", 15_000);
}

export function ttlActivityMs(): number {
  return envMs("CACHE_TTL_ACTIVITY", 14_000);
}

export function ttlNotificationsMs(): number {
  return envMs("CACHE_TTL_NOTIFICATIONS", 10_000);
}

export function ttlCommunityFeedMs(): number {
  return envMs("CACHE_TTL_COMMUNITY_FEED", 8000);
}

export function effectiveTtl(ms: number): number {
  if (!isCacheEnabled()) return 0;
  return getEffectiveCacheTtlMs(ms);
}
