/**
 * Normalized affinity snapshots for similarity — safe for cross-user comparison (public signals only).
 */

import type { CollectionMasteryDbRow } from "@/lib/collection/collection-mastery-merge";
import type { FandomIdentityFields } from "@/lib/fandom/fandom-identity-helpers";
import type { JourneyProgressDbRow } from "@/lib/journeys/journey-catalog";
import {
  pickTopTradeBadgeKey,
  type TradeReputationCounts,
} from "@/lib/trade/trade-reputation-helpers";
import { pickTopValueBadgeKey, type CollectionValueCacheRow } from "@/lib/value/value-identity-helpers";

export type CollectorAffinitySnapshot = {
  formatId: string | null;
  archetypeId: string | null;
  fandom: {
    setId: string | null;
    eraId: string | null;
    artistId: string | null;
    characterId: string | null;
    themeId: string | null;
  };
  valueBadgeKey: string | null;
  rarityProfileLabel: string | null;
  tradeBadgeKey: string | null;
  tradeReputation: TradeReputationCounts | null;
  masteryCompleteKeys: string[];
  journeyCompleteIds: string[];
  seasonalBadgeKeys: string[];
  grailCatalogCardIds: string[];
};

function masteryKeyRow(r: CollectionMasteryDbRow): string | null {
  if (!r.is_complete) return null;
  return `${r.mastery_type}:${r.mastery_key}`;
}

export function extractPlayAffinity(user: {
  favoriteFormatId?: string | null;
  favoriteArchetypeId?: string | null;
}): Pick<CollectorAffinitySnapshot, "formatId" | "archetypeId"> {
  return {
    formatId: user.favoriteFormatId?.trim() ? String(user.favoriteFormatId).trim() : null,
    archetypeId: user.favoriteArchetypeId?.trim() ? String(user.favoriteArchetypeId).trim() : null,
  };
}

export function extractFandomAffinity(row: FandomIdentityFields | null | undefined): CollectorAffinitySnapshot["fandom"] {
  if (!row) {
    return {
      setId: null,
      eraId: null,
      artistId: null,
      characterId: null,
      themeId: null,
    };
  }
  return {
    setId: row.favoriteSetId?.trim() ?? null,
    eraId: row.favoriteEraId?.trim() ?? null,
    artistId: row.favoriteArtistId?.trim() ?? null,
    characterId: row.favoriteCharacterId?.trim() ?? null,
    themeId: row.favoriteThemeId?.trim() ?? null,
  };
}

export function extractValueAffinity(cache: CollectionValueCacheRow | null | undefined): {
  valueBadgeKey: string | null;
  rarityProfileLabel: string | null;
} {
  if (!cache) return { valueBadgeKey: null, rarityProfileLabel: null };
  return {
    valueBadgeKey: pickTopValueBadgeKey(cache),
    rarityProfileLabel: null,
  };
}

export function extractMasteryAffinity(rows: CollectionMasteryDbRow[] | undefined): string[] {
  if (!rows?.length) return [];
  const keys = rows.map(masteryKeyRow).filter((x): x is string => Boolean(x));
  return [...new Set(keys)].sort();
}

export function extractJourneyAffinity(rows: JourneyProgressDbRow[] | undefined): string[] {
  if (!rows?.length) return [];
  return [...new Set(rows.filter((r) => r.is_complete).map((r) => r.journey_id))].sort();
}

export function extractSeasonalAffinity(keys: string[] | undefined): string[] {
  if (!keys?.length) return [];
  return [...new Set(keys.map((k) => k.trim()).filter(Boolean))].sort();
}

export function extractTradeAffinity(
  rep: TradeReputationCounts | null | undefined,
  tierSlug: string | null | undefined
): { tradeBadgeKey: string | null; tradeReputation: TradeReputationCounts | null } {
  return {
    tradeBadgeKey: pickTopTradeBadgeKey(rep ?? null, tierSlug),
    tradeReputation: rep ?? null,
  };
}

export function extractGrailAffinity(catalogCardIds: string[] | undefined): string[] {
  if (!catalogCardIds?.length) return [];
  return [...new Set(catalogCardIds.map((x) => String(x).trim()).filter(Boolean))].sort();
}

/** Build full snapshot for similarity scoring (includes grail catalog ids when provided). */
export function buildCollectorAffinitySnapshot(args: {
  play: ReturnType<typeof extractPlayAffinity>;
  fandom: CollectorAffinitySnapshot["fandom"];
  valueCache: CollectionValueCacheRow | null | undefined;
  masteryRows: CollectionMasteryDbRow[] | undefined;
  journeyRows: JourneyProgressDbRow[] | undefined;
  seasonalBadgeKeys: string[] | undefined;
  tradeRep: TradeReputationCounts | null | undefined;
  tierSlug: string | null | undefined;
  grailCatalogCardIds?: string[] | undefined;
}): CollectorAffinitySnapshot {
  const v = extractValueAffinity(args.valueCache ?? null);
  const tr = extractTradeAffinity(args.tradeRep, args.tierSlug);
  return {
    formatId: args.play.formatId,
    archetypeId: args.play.archetypeId,
    fandom: args.fandom,
    valueBadgeKey: v.valueBadgeKey,
    rarityProfileLabel: v.rarityProfileLabel,
    tradeBadgeKey: tr.tradeBadgeKey,
    tradeReputation: tr.tradeReputation,
    masteryCompleteKeys: extractMasteryAffinity(args.masteryRows),
    journeyCompleteIds: extractJourneyAffinity(args.journeyRows),
    seasonalBadgeKeys: extractSeasonalAffinity(args.seasonalBadgeKeys),
    grailCatalogCardIds: extractGrailAffinity(args.grailCatalogCardIds),
  };
}
