/**
 * Client-side analytics for deck editor (curve + type breakdown from embedded catalog).
 */

export type CatalogLike = {
  supertype: string | null;
  subtypes: string[];
} | null;

export type DeckRowForAnalytics = {
  quantity: number;
  cards: {
    catalog_cards: CatalogLike;
  } | null;
};

/** Pokémon-style “curve” buckets 0–7 from supertype + evolution subtypes. */
export function curveBucketForCatalog(cc: CatalogLike): number {
  if (!cc) return 0;
  const st = cc.supertype?.toLowerCase() ?? "";
  if (st === "energy") return 0;
  if (st === "trainer") return 1;
  const sub = (cc.subtypes ?? []).map((s) => s.toLowerCase());
  if (sub.some((s) => s.includes("stage 2"))) return 5;
  if (sub.some((s) => s.includes("stage 1"))) return 3;
  if (sub.some((s) => s.includes("basic"))) return 2;
  return 2;
}

/** Quantity-weighted histogram for buckets 0..7 (main + side combined). */
export function buildCurveHistogram(rows: DeckRowForAnalytics[]): number[] {
  const hist = Array.from({ length: 8 }, () => 0);
  for (const r of rows) {
    const cc = r.cards?.catalog_cards ?? null;
    const b = curveBucketForCatalog(cc);
    const safe = Math.min(7, Math.max(0, b));
    hist[safe] += r.quantity;
  }
  return hist;
}

export type TypeSlice = { label: string; count: number; pct: number };

export function buildTypeBreakdown(rows: DeckRowForAnalytics[]): TypeSlice[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const label =
      r.cards?.catalog_cards?.supertype?.trim() || "Unknown";
    map.set(label, (map.get(label) ?? 0) + r.quantity);
    total += r.quantity;
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({
      label,
      count,
      pct: total ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}
