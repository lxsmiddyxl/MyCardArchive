/**
 * Phase 24 — Badge catalog: categories, tiers, seasonal windows, prestige framing.
 * Static legacy definitions remain in `badge-meta.ts`; this layer adds v2 progression vocabulary.
 */

import { getBadgeMeta } from "@/lib/badges/badge-meta";

/** High-level buckets for v2 tracks + legacy badge_type mapping hints. */
export type BadgeCatalogCategory =
  | "mastery"
  | "seasonal"
  | "prestige"
  | "social"
  | "collection"
  | "influence"
  | "reputation";

export type BadgeTierToken = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export type SeasonalBadgeWindow = {
  badgeKey: string;
  /** ISO date start (inclusive), UTC */
  startsAt: string;
  /** ISO date end (exclusive), UTC */
  endsAt: string;
  /** Short label for UI */
  seasonLabel: string;
};

/** Known seasonal badge keys from `badge-meta` — windows are illustrative for UX copy. */
export const SEASONAL_BADGE_WINDOWS: readonly SeasonalBadgeWindow[] = [
  {
    badgeKey: "spring_2026_collector",
    startsAt: "2026-03-01T00:00:00.000Z",
    endsAt: "2026-06-01T00:00:00.000Z",
    seasonLabel: "Spring 2026",
  },
  {
    badgeKey: "summer_2026_scan_sprint",
    startsAt: "2026-06-01T00:00:00.000Z",
    endsAt: "2026-09-01T00:00:00.000Z",
    seasonLabel: "Summer 2026",
  },
  {
    badgeKey: "holiday_2026_collector",
    startsAt: "2026-11-15T00:00:00.000Z",
    endsAt: "2027-01-15T00:00:00.000Z",
    seasonLabel: "Holiday 2026",
  },
];

/** Prestige chain narrative (matches SQL `prestige_collector_journey` chapters). */
export const PRESTIGE_CHAIN = {
  id: "prestige_collector_journey",
  chapters: ["Foundation chapter", "Momentum chapter", "Legacy chapter"],
} as const;

export type BadgeV2RpcRow = {
  user_id?: string;
  badge_type: string;
  badge_key: string;
  catalog_category: string;
  tier: string;
  qualitative_label: string;
  season_label: string | null;
  prestige_step: number | null;
  prestige_steps_total: number | null;
  display_hint: string | null;
};

export type BadgeV2ProgressRow = {
  badgeKey: string;
  catalogCategory: BadgeCatalogCategory;
  tier: BadgeTierToken;
  qualitativeLabel: string;
  seasonLabel: string | null;
  prestigeStep: number | null;
  prestigeStepsTotal: number | null;
  displayHint: string | null;
};

const TIER_ORDER: BadgeTierToken[] = ["bronze", "silver", "gold", "platinum", "diamond"];

function tierRank(t: string): number {
  const i = TIER_ORDER.indexOf(t.toLowerCase() as BadgeTierToken);
  return i >= 0 ? i : 0;
}

export function tierAccentClass(tier: string): string {
  switch (tier.toLowerCase()) {
    case "diamond":
      return "border-violet-400/50 text-violet-100 bg-violet-950/30";
    case "platinum":
      return "border-cyan-400/45 text-cyan-50 bg-cyan-950/25";
    case "gold":
      return "border-mca-gold/50 text-mca-gold bg-amber-950/20";
    case "silver":
      return "border-slate-400/45 text-slate-100 bg-slate-900/30";
    default:
      return "border-amber-800/50 text-amber-100 bg-amber-950/25";
  }
}

/** Map legacy `badge-meta` category string into catalog bucket (for hybrid displays). */
export function legacyBadgeTypeToCatalogCategory(badgeType: string): BadgeCatalogCategory {
  switch (badgeType) {
    case "collection_mastery":
      return "mastery";
    case "seasonal_event":
      return "seasonal";
    case "scan_milestone":
    case "collection_value":
      return "collection";
    case "trade_reputation":
    case "play_identity":
    case "fandom":
      return "social";
    case "reputation":
      return "reputation";
    case "influence":
      return "influence";
    default:
      return "collection";
  }
}

export function rpcRowToProgressRow(r: BadgeV2RpcRow): BadgeV2ProgressRow | null {
  const bk = r.badge_key?.trim();
  if (!bk) return null;
  const tier = (r.tier?.trim().toLowerCase() ?? "bronze") as BadgeTierToken;
  const cat = (r.catalog_category?.trim().toLowerCase() ?? "collection") as BadgeCatalogCategory;
  return {
    badgeKey: bk,
    catalogCategory: cat,
    tier: TIER_ORDER.includes(tier) ? tier : "bronze",
    qualitativeLabel: r.qualitative_label?.trim() || "Emerging",
    seasonLabel: r.season_label?.trim() ?? null,
    prestigeStep: r.prestige_step ?? null,
    prestigeStepsTotal: r.prestige_steps_total ?? null,
    displayHint: r.display_hint?.trim() ?? null,
  };
}

/** Partition RPC rows for enrichment + profile (qualitative only — no scores). */
export function partitionBadgeV2Rows(rows: BadgeV2RpcRow[]): {
  badgeProgress: BadgeV2ProgressRow[];
  topBadges: string[];
  seasonalBadges: string[];
  prestigeBadges: string[];
  badgeHighlight: string | null;
} {
  const parsed = rows.map(rpcRowToProgressRow).filter((x): x is BadgeV2ProgressRow => x != null);
  const prestige = parsed.filter((p) => p.badgeKey === "prestige_collector_journey");
  const seasonal = parsed.filter((p) => p.badgeKey === "seasonal_presence");
  const tiered = parsed.filter((p) => p.badgeKey !== "prestige_collector_journey");

  const topSorted = [...tiered].sort((a, b) => tierRank(b.tier) - tierRank(a.tier));
  const topBadges = topSorted.slice(0, 3).map((p) => {
    const title =
      p.badgeKey === "scan_momentum"
        ? "Archive scans"
        : p.badgeKey === "community_voice"
          ? "Community voice"
          : p.badgeKey === "set_mastery_depth"
            ? "Set mastery"
            : p.badgeKey === "club_network"
              ? "Club network"
              : p.displayHint ?? p.badgeKey;
    return `${title} · ${p.qualitativeLabel}`;
  });

  const seasonalBadges = seasonal.map((s) =>
    s.seasonLabel ? `${s.seasonLabel} · ${s.qualitativeLabel}` : s.qualitativeLabel
  );

  const prestigeBadges = prestige.map((p) => p.qualitativeLabel);

  const parts = [...topBadges.slice(0, 2), ...seasonalBadges.slice(0, 1), ...prestigeBadges.slice(0, 1)].filter(
    Boolean
  );
  const badgeHighlight = parts.length > 0 ? parts.join(" · ") : null;

  return {
    badgeProgress: parsed,
    topBadges,
    seasonalBadges,
    prestigeBadges,
    badgeHighlight,
  };
}

/** Resolve seasonal window label for legacy earned seasonal badges (display-only). */
export function seasonalWindowLabelForBadgeKey(badgeKey: string): string | null {
  const w = SEASONAL_BADGE_WINDOWS.find((x) => x.badgeKey === badgeKey);
  if (w) return w.seasonLabel;
  const m = getBadgeMeta("seasonal_event", badgeKey);
  return m?.displayName ?? null;
}
