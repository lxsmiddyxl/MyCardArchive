import {
  getFandomOptionById,
  listAllOrderedFandomFlairKeys,
  type FandomValueKind,
} from "@/lib/fandom/fandom-catalog";
import { listAllArchetypes } from "@/lib/play/archetype-catalog";
import { listAllFormats } from "@/lib/play/formats-catalog";
import { PLAY_FLAIR_PRIORITY_ORDER } from "@/lib/play/play-flair-order";

export type FlairCategory =
  | "reputation"
  | "influence"
  | "streak"
  | "seasonal"
  | "shop"
  | "trade"
  | "play"
  | "value"
  | "fandom"
  | "journey"
  | "collection";

export type FlairMeta = {
  key: string;
  category: FlairCategory;
  displayName: string;
  description: string;
  /** Short Unicode / emoji token for compact inline UI */
  iconGlyph: string;
};

function fandomMetaForKey(flairKey: string): FlairMeta {
  const m = /^fandom_(set|era|artist|character|theme)_(.+)$/i.exec(flairKey.trim());
  const kind = (m?.[1] ?? "set") as FandomValueKind;
  const slugRaw = (m?.[2] ?? "").trim();
  const opt = slugRaw ? getFandomOptionById(kind, slugRaw) : null;
  const slugLabel = slugRaw.replace(/_/g, " ") || flairKey;
  return {
    key: flairKey,
    category: "fandom",
    displayName: opt ? `Taste · ${opt.displayName}` : `Taste · ${slugLabel}`,
    description:
      opt?.description ?? `Pinned Pokémon TCG collector taste (${kind}${opt ? "" : `: ${slugLabel}`}).`,
    iconGlyph: opt?.icon ?? "🎴",
  };
}

export const ORDERED_FANDOM_FLAIR_KEYS: readonly string[] = listAllOrderedFandomFlairKeys();

const META: FlairMeta[] = [
  {
    key: "active_collector",
    category: "streak",
    displayName: "Active Collector",
    description: "Logged in-app activity on at least 3 consecutive UTC days.",
    iconGlyph: "🔥",
  },
  {
    key: "consistent_collector",
    category: "streak",
    displayName: "Consistent Collector",
    description: "Kept a 7+ day UTC activity streak with scans, posts, comments, or likes.",
    iconGlyph: "✦",
  },
  {
    key: "top_contributor",
    category: "reputation",
    displayName: "Top Contributor",
    description: "High community reputation from posts, comments, likes received, and scans.",
    iconGlyph: "★",
  },
  {
    key: "rep_helpful",
    category: "reputation",
    displayName: "Helpful Collector",
    description: "Known for thoughtful answers and constructive threads in the community.",
    iconGlyph: "💬",
  },
  {
    key: "rep_expert",
    category: "reputation",
    displayName: "Expert Collector",
    description: "Known for deep deck, set, and rarity knowledge from public signals.",
    iconGlyph: "🧠",
  },
  {
    key: "rep_positive",
    category: "reputation",
    displayName: "Positive Contributor",
    description: "Collectors often show appreciation for your public posts.",
    iconGlyph: "✨",
  },
  {
    key: "rep_reliable",
    category: "reputation",
    displayName: "Reliable Collector",
    description: "Steady presence, streaks, and seasonal participation — never penalized for breaks.",
    iconGlyph: "⏱️",
  },
  {
    key: "rep_pillar",
    category: "reputation",
    displayName: "Community Pillar",
    description: "Balances helpfulness, expertise, positivity, reliability, and contribution.",
    iconGlyph: "🏛️",
  },
  {
    key: "infl_identity",
    category: "influence",
    displayName: "Identity Influencer",
    description: "Collector identity resonates across persona and club surfaces.",
    iconGlyph: "🧭",
  },
  {
    key: "infl_community",
    category: "influence",
    displayName: "Community Influencer",
    description: "Posts, comments, and scans frequently show up in social spaces.",
    iconGlyph: "📝",
  },
  {
    key: "infl_expert",
    category: "influence",
    displayName: "Expert Influencer",
    description: "Expertise from decks, mastery, and collection depth travels across the network.",
    iconGlyph: "🧠",
  },
  {
    key: "infl_seasonal",
    category: "influence",
    displayName: "Seasonal Influencer",
    description: "Steady seasonal and recap participation keeps your identity visible.",
    iconGlyph: "🌤️",
  },
  {
    key: "infl_collector",
    category: "influence",
    displayName: "Collector Influencer",
    description: "Balanced identity, contribution, expertise, social, and seasonal reach.",
    iconGlyph: "🕸️",
  },
  {
    key: "trade_reliable_shop",
    category: "trade",
    displayName: "Reliable shop",
    description: "Business-tier account with strong trade volume and excellent positive feedback.",
    iconGlyph: "🛡️",
  },
  {
    key: "trade_veteran_trader",
    category: "trade",
    displayName: "Veteran trader",
    description: "Fifty or more completed peer trades with consistent positive feedback.",
    iconGlyph: "🎖️",
  },
  {
    key: "trade_trusted_trader",
    category: "trade",
    displayName: "Trusted trader",
    description: "At least ten completed trades with a high share of positive feedback.",
    iconGlyph: "🤝",
  },
  {
    key: "verified_shop",
    category: "shop",
    displayName: "Verified Shop",
    description: "Business plan with at least one collection CSV export on record.",
    iconGlyph: "🏪",
  },
  {
    key: "spring_2026_event",
    category: "seasonal",
    displayName: "Spring 2026",
    description: "Seasonal flair for the Spring 2026 collector event.",
    iconGlyph: "🌸",
  },
  {
    key: "summer_2026_scan_event",
    category: "seasonal",
    displayName: "Summer Scan Sprint",
    description: "Seasonal flair for the Summer 2026 scan sprint.",
    iconGlyph: "☀️",
  },
  {
    key: "holiday_2026_event",
    category: "seasonal",
    displayName: "Holiday 2026",
    description: "Seasonal flair for the Holiday 2026 collector moment.",
    iconGlyph: "🎄",
  },
  {
    key: "journey_flair_scan_rookie",
    category: "journey",
    displayName: "Journey · Scan rookie",
    description: "Flair for completing the 50-scan collector journey.",
    iconGlyph: "◎",
  },
  {
    key: "journey_flair_scan_veteran",
    category: "journey",
    displayName: "Journey · Scan veteran",
    description: "Flair for completing the 500-scan collector journey.",
    iconGlyph: "◉",
  },
  {
    key: "journey_flair_binder_started",
    category: "journey",
    displayName: "Journey · Binder started",
    description: "Flair for creating your first binder journey milestone.",
    iconGlyph: "▣",
  },
  {
    key: "journey_flair_set_explorer",
    category: "journey",
    displayName: "Journey · Set explorer",
    description: "Flair for logging cards across ten catalog sets.",
    iconGlyph: "◇",
  },
  {
    key: "journey_flair_streak_week",
    category: "journey",
    displayName: "Journey · Week streak",
    description: "Flair for holding a seven-day UTC activity streak.",
    iconGlyph: "✧",
  },
  {
    key: "journey_flair_reputed",
    category: "journey",
    displayName: "Journey · Reputed collector",
    description: "Flair for reaching 1,000 reputation through community activity.",
    iconGlyph: "✶",
  },
  {
    key: "binder_mastery_first",
    category: "collection",
    displayName: "Binder mastery · First",
    description: "Flair for your first fully-filled binder.",
    iconGlyph: "▤",
  },
  {
    key: "binder_mastery_triple",
    category: "collection",
    displayName: "Binder mastery · Triple",
    description: "Flair for three complete binders.",
    iconGlyph: "▦",
  },
  {
    key: "binder_mastery_deca",
    category: "collection",
    displayName: "Binder mastery · Decade",
    description: "Flair for ten complete binders.",
    iconGlyph: "▧",
  },
  {
    key: "set_mastery_first",
    category: "collection",
    displayName: "Set mastery · First",
    description: "Flair for your first master catalog set.",
    iconGlyph: "◆",
  },
  {
    key: "set_mastery_five",
    category: "collection",
    displayName: "Set mastery · Five",
    description: "Flair for five master sets.",
    iconGlyph: "⬡",
  },
  {
    key: "set_mastery_ten",
    category: "collection",
    displayName: "Set mastery · Ten",
    description: "Flair for ten master sets.",
    iconGlyph: "✹",
  },
  ...listAllFormats().map(
    (f): FlairMeta => ({
      key: `play_format_${f.formatId}`,
      category: "play",
      displayName: `Play · ${f.displayName}`,
      description: f.description,
      iconGlyph: f.icon,
    })
  ),
  ...listAllArchetypes().map(
    (a): FlairMeta => ({
      key: `play_archetype_${a.archetypeId}`,
      category: "play",
      displayName: `Play · ${a.displayName}`,
      description: a.description,
      iconGlyph: a.icon,
    })
  ),
  {
    key: "play_favorite_deck",
    category: "play",
    displayName: "Signature deck",
    description: "You named a favorite deck on your profile — your go-to list for events and leagues.",
    iconGlyph: "📇",
  },
  {
    key: "year_in_review_explorer",
    category: "journey",
    displayName: "Year in Review",
    description: "Opened your Collector Year-in-Review recap in the app (never auto-posted).",
    iconGlyph: "📅",
  },
  {
    key: "value_high_value_collector",
    category: "value",
    displayName: "Collection value · Premium",
    description: "Estimated catalog value crossed a high threshold — illustrative only, not a price guarantee.",
    iconGlyph: "💎",
  },
  {
    key: "value_rarity_hunter",
    category: "value",
    displayName: "Collection value · Rare finds",
    description: "Many high-rarity cards in your binder — based on metadata, not market quotes alone.",
    iconGlyph: "✨",
  },
  {
    key: "value_unique_collector",
    category: "value",
    displayName: "Collection value · Broad coverage",
    description: "A wide spread of unique catalog cards — diversity over raw volume.",
    iconGlyph: "🗂️",
  },
  ...ORDERED_FANDOM_FLAIR_KEYS.map((fk) => fandomMetaForKey(fk)),
];

const BY_KEY: Record<string, FlairMeta> = Object.fromEntries(META.map((m) => [m.key, m]));

/** Inline / profile ordering: higher index = shown first as “top” flair when multiple earned. */
export const FLAIR_PRIORITY: readonly string[] = [
  "top_contributor",
  "consistent_collector",
  "active_collector",
  "journey_flair_reputed",
  "journey_flair_scan_veteran",
  "journey_flair_set_explorer",
  "journey_flair_binder_started",
  "journey_flair_scan_rookie",
  "journey_flair_streak_week",
  "year_in_review_explorer",
  "binder_mastery_deca",
  "binder_mastery_triple",
  "binder_mastery_first",
  "set_mastery_ten",
  "set_mastery_five",
  "set_mastery_first",
  "holiday_2026_event",
  "summer_2026_scan_event",
  "spring_2026_event",
  "trade_reliable_shop",
  "trade_veteran_trader",
  "trade_trusted_trader",
  ...PLAY_FLAIR_PRIORITY_ORDER,
  "value_high_value_collector",
  "value_rarity_hunter",
  "value_unique_collector",
  ...ORDERED_FANDOM_FLAIR_KEYS,
  "rep_pillar",
  "rep_expert",
  "rep_helpful",
  "rep_positive",
  "rep_reliable",
  "infl_collector",
  "infl_expert",
  "infl_community",
  "infl_identity",
  "infl_seasonal",
  "verified_shop",
];

let cacheVersion = 0;
const metaCache = new Map<string, { v: number; meta: FlairMeta | null }>();

export function getCachedFlairMeta(flairKey: string): FlairMeta | null {
  const k = flairKey.trim();
  if (!k) return null;
  const hit = metaCache.get(k);
  if (hit && hit.v === cacheVersion) return hit.meta;
  let meta = BY_KEY[k] ?? null;
  if (!meta && /^fandom_/i.test(k)) {
    meta = fandomMetaForKey(k);
  }
  metaCache.set(k, { v: cacheVersion, meta });
  return meta;
}

/** Test / hot reload: bump so client dev caches reset if needed */
export function bumpFlairMetaCacheVersion(): void {
  cacheVersion++;
  metaCache.clear();
}
