import type { CollectionMasteryDbRow } from "@/lib/collection/collection-mastery-merge";
import type { FandomIdentityFields } from "@/lib/fandom/fandom-identity-helpers";
import { getFandomOptionById } from "@/lib/fandom/fandom-catalog";
import { getSeasonalEventByBadgeKey } from "@/lib/events/seasonal-events";
import type { JourneyProgressDbRow } from "@/lib/journeys/journey-catalog";
import { getJourneyCatalogEntry } from "@/lib/journeys/journey-catalog";
import { getArchetypeById } from "@/lib/play/archetype-catalog";
import { getFormatById } from "@/lib/play/formats-catalog";
import {
  hasReliableShopStatus,
  hasTrustedTraderStatus,
  hasVeteranTraderStatus,
  type TradeReputationCounts,
} from "@/lib/trade/trade-reputation-helpers";
import {
  HIGH_VALUE_CENTS_THRESHOLD,
  pickTopValueBadgeKey,
  rarityProfileFromCounts,
  type CollectionValueCacheRow,
} from "@/lib/value/value-identity-helpers";
import {
  MASTERY_FRAGMENTS,
  PERSONA_DEFAULT_LINE,
  PERSONA_MAX_CHARS,
  SEASONAL_FRAGMENTS,
  TRADE_FRAGMENTS,
  VALUE_FRAGMENTS,
} from "@/lib/persona/persona-rules";

export type CollectorPersonaPlayIdentity = {
  favoriteFormatId: string | null;
  favoriteArchetypeId: string | null;
  favoriteDeckName?: string | null;
} | null;

/** Optional extended inputs — all nullable-safe. */
export type CollectorPersonaContext = {
  tierSlug?: string | null;
  playIdentity: CollectorPersonaPlayIdentity;
  fandomIdentity: FandomIdentityFields | null;
  valueIdentity: CollectionValueCacheRow | null;
  collectionMasteryRows: CollectionMasteryDbRow[];
  tradeReputation: TradeReputationCounts | null;
  seasonalBadgeKeys: string[];
  journeyRows?: JourneyProgressDbRow[] | null;
};

function trimSentence(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= PERSONA_MAX_CHARS) return t;
  const cut = t.slice(0, PERSONA_MAX_CHARS - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

/** Leading article for the nucleus noun phrase only. */
function articleLead(nucleus: string): string {
  const w = nucleus.trim();
  if (!w) return "A collector";
  const first = w[0]?.toLowerCase();
  const useAn = first === "a" || first === "e" || first === "i" || first === "o" || first === "u";
  return `${useAn ? "An" : "A"} ${w}`;
}

function buildPlayNucleus(play: CollectorPersonaPlayIdentity): string | null {
  if (!play) return null;
  const fmt = getFormatById(play.favoriteFormatId)?.displayName ?? null;
  const arch = getArchetypeById(play.favoriteArchetypeId)?.displayName ?? null;
  if (fmt && arch) {
    return `${fmt}-leaning ${arch} tactician`;
  }
  if (fmt) {
    return `${fmt} specialist`;
  }
  if (arch) {
    return `${arch}-style deckbuilder`;
  }
  return null;
}

function shortEraName(eraId: string | null | undefined): string | null {
  if (!eraId?.trim()) return null;
  const o = getFandomOptionById("era", eraId);
  return o?.displayName ?? null;
}

function shortCharacterName(id: string | null | undefined): string | null {
  if (!id?.trim()) return null;
  const o = getFandomOptionById("character", id);
  return o?.displayName ?? null;
}

function shortArtistName(id: string | null | undefined): string | null {
  if (!id?.trim()) return null;
  const o = getFandomOptionById("artist", id);
  return o?.displayName ?? null;
}

function shortThemeName(id: string | null | undefined): string | null {
  if (!id?.trim()) return null;
  const o = getFandomOptionById("theme", id);
  return o?.displayName ?? null;
}

/** Fandom clause — era + tribe preferred; otherwise artist/theme/set singles. */
function buildFandomTail(fi: FandomIdentityFields | null): string | null {
  if (!fi) return null;
  const era = shortEraName(fi.favoriteEraId);
  const ch = shortCharacterName(fi.favoriteCharacterId);
  const art = shortArtistName(fi.favoriteArtistId);
  const th = shortThemeName(fi.favoriteThemeId);
  const set =
    fi.favoriteSetId?.trim() != null
      ? getFandomOptionById("set", fi.favoriteSetId)?.displayName
      : null;

  if (era && ch) {
    return `drawn to ${era} ${ch.toLowerCase()}`;
  }
  if (era) {
    return `with nostalgia for the ${era} era`;
  }
  if (ch) {
    return `focused on ${ch.toLowerCase()}`;
  }
  if (art) {
    return `devoted to ${art}'s artwork`;
  }
  if (th) {
    return `who favors ${th.toLowerCase()} finishes`;
  }
  if (set) {
    return `who keeps returning to ${set}`;
  }
  return null;
}

function buildValueTail(row: CollectionValueCacheRow | null): string | null {
  if (!row) return null;
  const badge = pickTopValueBadgeKey(row);
  const rp = rarityProfileFromCounts(row);
  const cents = row.estimatedValueCents ?? 0;

  if (badge === "high_value_collector" || cents >= HIGH_VALUE_CENTS_THRESHOLD) {
    return VALUE_FRAGMENTS.highPortfolio;
  }
  if (badge === "rarity_hunter") {
    return VALUE_FRAGMENTS.rarityHunter;
  }
  if (badge === "unique_collector") {
    return VALUE_FRAGMENTS.varietySeeker;
  }
  if (rp === "High-rarity heavy") return VALUE_FRAGMENTS.rarityHeavy;
  if (rp === "Unique-focused") return VALUE_FRAGMENTS.uniqueLean;
  if (rp === "Bulk-focused") return VALUE_FRAGMENTS.bulkLean;
  if (rp === "Balanced") return VALUE_FRAGMENTS.balancedBinder;
  return null;
}

function buildMasteryTail(rows: CollectionMasteryDbRow[]): string | null {
  const complete = rows.filter((r) => r.is_complete);
  if (complete.length === 0) return null;
  const binders = complete.filter((r) => r.mastery_type === "binder").length;
  const sets = complete.filter((r) => r.mastery_type === "set").length;
  if (binders > 0 && sets > 0) return MASTERY_FRAGMENTS.binderAndSet;
  if (binders > 0) return MASTERY_FRAGMENTS.binderOnly;
  if (sets > 0) return MASTERY_FRAGMENTS.setOnly;
  return MASTERY_FRAGMENTS.completing;
}

function buildTradeTail(row: TradeReputationCounts | null, tierSlug: string | null | undefined): string | null {
  if (!row) return null;
  if (hasReliableShopStatus(row, tierSlug)) return TRADE_FRAGMENTS.reliable_shop;
  if (hasVeteranTraderStatus(row)) return TRADE_FRAGMENTS.veteran_trader;
  if (hasTrustedTraderStatus(row)) return TRADE_FRAGMENTS.trusted_trader;
  return null;
}

function pickSeasonalTail(keys: string[]): string | null {
  const k = [...keys].sort();
  for (const id of k) {
    const tail = SEASONAL_FRAGMENTS[id];
    if (tail) return tail;
    const ev = getSeasonalEventByBadgeKey(id);
    if (ev?.displayName) {
      return `with ${ev.displayName.toLowerCase()} flair`;
    }
  }
  return null;
}

function pickJourneyTail(rows: JourneyProgressDbRow[] | null | undefined): string | null {
  if (!rows?.length) return null;
  const done = rows.filter((r) => r.is_complete);
  if (done.length === 0) return null;
  let best: JourneyProgressDbRow | null = null;
  let bestSteps = -1;
  for (const r of done) {
    const meta = getJourneyCatalogEntry(r.journey_id);
    const ts = meta?.totalSteps ?? 0;
    if (ts > bestSteps) {
      bestSteps = ts;
      best = r;
    }
  }
  const meta = best ? getJourneyCatalogEntry(best.journey_id) : null;
  if (!meta) return null;
  return `guided by milestones like ${meta.displayName.toLowerCase()}`;
}

/**
 * Deterministic single-sentence collector persona for social surfaces.
 * Avoids dollar figures and private inventory detail.
 */
export function buildCollectorPersona(ctx: CollectorPersonaContext): string {
  const nucleus = buildPlayNucleus(ctx.playIdentity) ?? "collector";
  const tails = [
    buildFandomTail(ctx.fandomIdentity),
    buildValueTail(ctx.valueIdentity),
    buildMasteryTail(ctx.collectionMasteryRows),
    buildTradeTail(ctx.tradeReputation, ctx.tierSlug),
    pickJourneyTail(ctx.journeyRows ?? null),
    pickSeasonalTail(ctx.seasonalBadgeKeys ?? []),
  ].filter((x): x is string => Boolean(x?.trim()));

  if (tails.length === 0 && nucleus === "collector") {
    return PERSONA_DEFAULT_LINE;
  }

  let body = articleLead(nucleus);
  if (tails.length > 0) {
    body += ", " + tails.join(", ");
  }
  const out = body.endsWith(".") ? body : `${body}.`;
  return trimSentence(out);
}
