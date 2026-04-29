/** Aligned with migration `081_collection_value_identity.sql` badge + flair thresholds. */
export const HIGH_VALUE_CENTS_THRESHOLD = 100_000; // ≈ $1,000 USD when market_price is USD
export const RARITY_HUNTER_MIN_HIGH_RARITY = 25;
export const UNIQUE_COLLECTOR_MIN_UNIQUE = 250;

export type CollectionValueCacheRow = {
  estimatedValueCents: number;
  totalCards: number;
  uniqueCards: number;
  highRarityCount: number;
  lastRefreshedAt: string | null;
};

export function formatUsdApproxFromCents(cents: number): string {
  const n = Math.max(0, Math.round(cents)) / 100;
  if (n >= 1_000_000) return `≈$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `≈$${Math.round(n / 1000)}k`;
  return `≈$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** One-line summary for tooltips and strips (estimates, not financial advice). */
export function buildValueIdentitySummary(row: CollectionValueCacheRow | null | undefined): string | null {
  if (!row) return null;
  const v = formatUsdApproxFromCents(row.estimatedValueCents);
  const t = row.totalCards ?? 0;
  const hr = row.highRarityCount ?? 0;
  if (t <= 0 && (row.estimatedValueCents ?? 0) <= 0) return null;
  return `${v} est. value · ${t} cards · ${hr} high-rarity`;
}

export function rarityProfileFromCounts(row: CollectionValueCacheRow | null | undefined): string | null {
  if (!row) return null;
  const total = row.totalCards ?? 0;
  const u = row.uniqueCards ?? 0;
  const hi = row.highRarityCount ?? 0;
  if (total <= 0) return null;
  const hiRatio = hi / Math.max(1, total);
  const uniqRatio = u / Math.max(1, total);
  if (hiRatio >= 0.12) return "High-rarity heavy";
  if (uniqRatio >= 0.85 && total > 40) return "Unique-focused";
  if (total > 200 && hiRatio < 0.04) return "Bulk-focused";
  return "Balanced";
}

export type TopValueBadgeKey = "high_value_collector" | "rarity_hunter" | "unique_collector";

export function pickTopValueBadgeKey(row: CollectionValueCacheRow | null | undefined): TopValueBadgeKey | null {
  if (!row) return null;
  const c = row.estimatedValueCents ?? 0;
  const hr = row.highRarityCount ?? 0;
  const uq = row.uniqueCards ?? 0;
  if (c >= HIGH_VALUE_CENTS_THRESHOLD) return "high_value_collector";
  if (hr >= RARITY_HUNTER_MIN_HIGH_RARITY) return "rarity_hunter";
  if (uq >= UNIQUE_COLLECTOR_MIN_UNIQUE) return "unique_collector";
  return null;
}

export function valueFlairKeysFromCache(row: CollectionValueCacheRow | null | undefined): string[] {
  const k = pickTopValueBadgeKey(row);
  if (!k) return [];
  if (k === "high_value_collector") return ["value_high_value_collector"];
  if (k === "rarity_hunter") return ["value_rarity_hunter"];
  return ["value_unique_collector"];
}
