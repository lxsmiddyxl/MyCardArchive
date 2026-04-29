/**
 * Collector–collector similarity weights (0–10 per axis). Sum caps at 80 raw → normalized to 0–100.
 * Keep numeric knobs aligned with `refresh_user_similarity` in migration `084_user_similarity_cache.sql`.
 */

import type { CollectorAffinitySnapshot } from "@/lib/social-graph/affinity-extractors";

/** Max contribution per family (each sub-score is 0…max). */
export const SIMILARITY_AXIS_MAX = {
  play: 10,
  fandom: 10,
  value: 10,
  mastery: 10,
  grail: 10,
  journey: 10,
  seasonal: 10,
  trade: 10,
} as const;

const RAW_SUM_MAX =
  SIMILARITY_AXIS_MAX.play +
  SIMILARITY_AXIS_MAX.fandom +
  SIMILARITY_AXIS_MAX.value +
  SIMILARITY_AXIS_MAX.mastery +
  SIMILARITY_AXIS_MAX.grail +
  SIMILARITY_AXIS_MAX.journey +
  SIMILARITY_AXIS_MAX.seasonal +
  SIMILARITY_AXIS_MAX.trade;

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function eqTrim(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = (a ?? "").trim().toLowerCase();
  const y = (b ?? "").trim().toLowerCase();
  return x.length > 0 && x === y;
}

/** Jaccard similarity for string sets → 0–1. */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union <= 0 ? 0 : inter / union;
}

function playScore(a: CollectorAffinitySnapshot, b: CollectorAffinitySnapshot): number {
  let s = 0;
  if (eqTrim(a.formatId, b.formatId)) s += 5;
  if (eqTrim(a.archetypeId, b.archetypeId)) s += 5;
  return Math.min(SIMILARITY_AXIS_MAX.play, s);
}

function fandomScore(a: CollectorAffinitySnapshot, b: CollectorAffinitySnapshot): number {
  const fa = a.fandom;
  const fb = b.fandom;
  let hits = 0;
  if (eqTrim(fa.setId, fb.setId)) hits++;
  if (eqTrim(fa.eraId, fb.eraId)) hits++;
  if (eqTrim(fa.artistId, fb.artistId)) hits++;
  if (eqTrim(fa.characterId, fb.characterId)) hits++;
  if (eqTrim(fa.themeId, fb.themeId)) hits++;
  return Math.min(SIMILARITY_AXIS_MAX.fandom, hits * 2);
}

const VALUE_ORDER = ["high_value_collector", "rarity_hunter", "unique_collector", ""] as const;

function valueTierIndex(k: string | null): number {
  const t = (k ?? "").trim();
  const i = VALUE_ORDER.indexOf(t as (typeof VALUE_ORDER)[number]);
  return i >= 0 ? i : 3;
}

function valueScore(a: CollectorAffinitySnapshot, b: CollectorAffinitySnapshot): number {
  const ka = a.valueBadgeKey;
  const kb = b.valueBadgeKey;
  if (!ka?.trim() && !kb?.trim()) return 0;
  if (eqTrim(ka, kb)) return SIMILARITY_AXIS_MAX.value;
  const da = Math.abs(valueTierIndex(ka) - valueTierIndex(kb));
  return Math.max(0, SIMILARITY_AXIS_MAX.value - da * 3);
}

function tradeScore(a: CollectorAffinitySnapshot, b: CollectorAffinitySnapshot): number {
  const ua = a.tradeBadgeKey?.trim();
  const ub = b.tradeBadgeKey?.trim();
  if (!ua && !ub) return 0;
  if (eqTrim(ua ?? null, ub ?? null)) return SIMILARITY_AXIS_MAX.trade;
  const order = ["reliable_shop", "veteran_trader", "trusted_trader"];
  const ia = ua ? order.indexOf(ua) : -1;
  const ib = ub ? order.indexOf(ub) : -1;
  if (ia < 0 || ib < 0) return 4;
  const d = Math.abs(ia - ib);
  return Math.max(0, SIMILARITY_AXIS_MAX.trade - d * 4);
}

function masteryScore(a: CollectorAffinitySnapshot, b: CollectorAffinitySnapshot): number {
  const sa = new Set(a.masteryCompleteKeys);
  const sb = new Set(b.masteryCompleteKeys);
  return Math.round(jaccardSimilarity(sa, sb) * SIMILARITY_AXIS_MAX.mastery);
}

function journeyScore(a: CollectorAffinitySnapshot, b: CollectorAffinitySnapshot): number {
  const sa = new Set(a.journeyCompleteIds);
  const sb = new Set(b.journeyCompleteIds);
  return Math.round(jaccardSimilarity(sa, sb) * SIMILARITY_AXIS_MAX.journey);
}

function seasonalScore(a: CollectorAffinitySnapshot, b: CollectorAffinitySnapshot): number {
  const sa = new Set(a.seasonalBadgeKeys.map((x) => x.trim()).filter(Boolean));
  const sb = new Set(b.seasonalBadgeKeys.map((x) => x.trim()).filter(Boolean));
  if (sa.size === 0 && sb.size === 0) return 0;
  return Math.round(jaccardSimilarity(sa, sb) * SIMILARITY_AXIS_MAX.seasonal);
}

function grailScore(a: CollectorAffinitySnapshot, b: CollectorAffinitySnapshot): number {
  const sa = new Set(a.grailCatalogCardIds.map((x) => x.trim()).filter(Boolean));
  const sb = new Set(b.grailCatalogCardIds.map((x) => x.trim()).filter(Boolean));
  if (sa.size === 0 && sb.size === 0) return 0;
  const inter = [...sa].filter((x) => sb.has(x)).length;
  if (inter === 0) return 0;
  const denom = Math.max(sa.size, sb.size, 1);
  return Math.round(clamp01(inter / denom) * SIMILARITY_AXIS_MAX.grail);
}

/**
 * Weighted similarity 0–100 (deterministic). Does not expose raw vectors — use only aggregated score in UI.
 */
export function computeSimilarityScore(a: CollectorAffinitySnapshot, b: CollectorAffinitySnapshot): number {
  const parts =
    playScore(a, b) +
    fandomScore(a, b) +
    valueScore(a, b) +
    masteryScore(a, b) +
    grailScore(a, b) +
    journeyScore(a, b) +
    seasonalScore(a, b) +
    tradeScore(a, b);
  return Math.min(100, Math.round((parts / RAW_SUM_MAX) * 100));
}

/** Neutral copy for tooltips — not “compatibility”. */
export function formatSimilarityScoreLabel(score: number): string {
  const n = Math.max(0, Math.min(100, Math.round(score)));
  return `Similarity score: ${n}`;
}

export type TraitOverlapInput = {
  favoriteFormatId: string | null;
  favoriteArchetypeId: string | null;
  favoriteEraId: string | null;
  favoriteSetId: string | null;
  favoriteArtistId: string | null;
  favoriteCharacterId: string | null;
  favoriteThemeId: string | null;
  topValueBadgeKey: string | null;
  topTradeBadgeKey: string | null;
  seasonalBadgeKeys: string[];
  journeyCompleteIds: string[];
  masteryCompleteKeys: string[];
};

/** Count overlapping public identity facets for “You share X/Y identity traits.” */
export function countSharedIdentityTraits(viewer: TraitOverlapInput, other: TraitOverlapInput): {
  matched: number;
  total: number;
} {
  const checks: boolean[] = [
    eqTrim(viewer.favoriteFormatId, other.favoriteFormatId),
    eqTrim(viewer.favoriteArchetypeId, other.favoriteArchetypeId),
    eqTrim(viewer.favoriteEraId, other.favoriteEraId),
    eqTrim(viewer.favoriteSetId, other.favoriteSetId),
    eqTrim(viewer.favoriteArtistId, other.favoriteArtistId),
    eqTrim(viewer.favoriteCharacterId, other.favoriteCharacterId),
    eqTrim(viewer.favoriteThemeId, other.favoriteThemeId),
    eqTrim(viewer.topValueBadgeKey, other.topValueBadgeKey),
    eqTrim(viewer.topTradeBadgeKey, other.topTradeBadgeKey),
    viewer.seasonalBadgeKeys.some((k) =>
      other.seasonalBadgeKeys.some((o) => eqTrim(k, o))
    ),
    viewer.journeyCompleteIds.some((j) => other.journeyCompleteIds.includes(j)),
    viewer.masteryCompleteKeys.some((m) => other.masteryCompleteKeys.includes(m)),
  ];
  const total = checks.length;
  const matched = checks.filter(Boolean).length;
  return { matched, total };
}

export function sharedTraitsTooltip(viewer: TraitOverlapInput, other: TraitOverlapInput): string {
  const { matched, total } = countSharedIdentityTraits(viewer, other);
  return `You share ${matched}/${total} identity traits (public signals only).`;
}
