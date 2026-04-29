/**
 * Collector clubs — metadata and eligibility hints.
 * Server assignment mirrors this file in `088_collector_clubs.sql` (`refresh_user_clubs`).
 */

export type ClubEligibilityHints = {
  /** Favorite play format id (e.g. commander). */
  playFormatId?: string;
  /** Fandom era id (e.g. ex_series). */
  fandomEraId?: string;
  /** Fandom character id (e.g. charizard_line). */
  fandomCharacterId?: string;
  /** Minimum completed full binders (mastery rows, binder type, is_complete). */
  minCompletedBinders?: number;
  /** Trade rep: min completed trades with positive ratio (see SQL). */
  trustedTraderMinTrades?: number;
  trustedTraderMinPositiveRatio?: number;
  /** Value tier: min estimated value in cents (approximate). */
  minEstimatedValueCents?: number;
  /** Requires non-empty favorite artist id. */
  requiresFavoriteArtist?: boolean;
  /** At least one seasonal participation or seasonal_event badge. */
  requiresSeasonalParticipation?: boolean;
};

export type ClubCatalogEntry = {
  clubId: string;
  displayName: string;
  description: string;
  icon: string;
  colorToken: string;
  eligibilityRules: ClubEligibilityHints;
};

export const CLUB_CATALOG: readonly ClubCatalogEntry[] = [
  {
    clubId: "commander_club",
    displayName: "Commander Club",
    description: "Collectors whose play identity centers on Commander.",
    icon: "⎔",
    colorToken: "mca-accent-strong",
    eligibilityRules: { playFormatId: "commander" },
  },
  {
    clubId: "ex_era_dragons",
    displayName: "EX-Era Dragons",
    description: "Fans anchored on the EX / ADV era or the Charizard line.",
    icon: "🐲",
    colorToken: "mca-warn",
    eligibilityRules: { fandomEraId: "ex_series", fandomCharacterId: "charizard_line" },
  },
  {
    clubId: "binder_completionists",
    displayName: "Binder Completionists",
    description: "Three or more fully filled binders in collection mastery.",
    icon: "📚",
    colorToken: "mca-ok",
    eligibilityRules: { minCompletedBinders: 3 },
  },
  {
    clubId: "trusted_traders",
    displayName: "Trusted Traders",
    description: "Strong trade feedback history (approximate ratio, not financial advice).",
    icon: "🤝",
    colorToken: "mca-accent",
    eligibilityRules: { trustedTraderMinTrades: 10, trustedTraderMinPositiveRatio: 0.85 },
  },
  {
    clubId: "high_value_collectors",
    displayName: "High-Value Collectors",
    description: "Collection value cache crosses the high-value band (approximate estimate only).",
    icon: "✨",
    colorToken: "mca-gold",
    eligibilityRules: { minEstimatedValueCents: 100_000 },
  },
  {
    clubId: "artist_devotees",
    displayName: "Artist Devotees",
    description: "Pinned a favorite artist in fandom identity.",
    icon: "🎨",
    colorToken: "mca-ink-strong",
    eligibilityRules: { requiresFavoriteArtist: true },
  },
  {
    clubId: "seasonal_grinders",
    displayName: "Seasonal Grinders",
    description: "Took part in at least one seasonal campaign or holds a seasonal event badge.",
    icon: "🗓️",
    colorToken: "mca-accent-soft",
    eligibilityRules: { requiresSeasonalParticipation: true },
  },
] as const;

/** First matching club id wins as “primary” for chips and highlights. */
export const PRIMARY_CLUB_ORDER: readonly string[] = [
  "commander_club",
  "ex_era_dragons",
  "binder_completionists",
  "artist_devotees",
  "seasonal_grinders",
  "trusted_traders",
  "high_value_collectors",
];

const byId = new Map(CLUB_CATALOG.map((c) => [c.clubId, c] as const));

export function getClubById(clubId: string): ClubCatalogEntry | undefined {
  return byId.get(clubId);
}

export function listAllClubs(): readonly ClubCatalogEntry[] {
  return CLUB_CATALOG;
}

export function pickPrimaryClubId(memberClubIds: readonly string[]): string | null {
  const set = new Set(memberClubIds);
  for (const id of PRIMARY_CLUB_ORDER) {
    if (set.has(id)) return id;
  }
  return memberClubIds[0] ?? null;
}

export type ClubChip = { clubId: string; displayName: string };

export function mapClubIdsToChips(clubIds: readonly string[]): ClubChip[] {
  const out: ClubChip[] = [];
  for (const id of clubIds) {
    const c = getClubById(id);
    if (c) out.push({ clubId: c.clubId, displayName: c.displayName });
  }
  return out;
}

/** Tooltip / feed one-liner; omits raw ids. */
export function clubsSummaryLine(chips: readonly ClubChip[], maxNames = 4): string | null {
  if (chips.length === 0) return null;
  const names = chips.slice(0, maxNames).map((c) => c.displayName);
  const extra = chips.length > maxNames ? ` +${chips.length - maxNames}` : "";
  return `Clubs: ${names.join(", ")}${extra}`;
}

/** Intersection of viewer and other user club ids → short label for mutuals / recs. */
export function sharedClubsLabel(
  viewerClubIds: readonly string[],
  otherClubIds: readonly string[],
  maxNames = 4
): string | null {
  const set = new Set(viewerClubIds);
  const sharedIds = otherClubIds.filter((id) => set.has(id));
  if (sharedIds.length === 0) return null;
  const chips = mapClubIdsToChips(sharedIds);
  const names = chips.slice(0, maxNames).map((c) => c.displayName);
  const extra = chips.length > maxNames ? ` +${chips.length - maxNames}` : "";
  return `Shared clubs: ${names.join(", ")}${extra}`;
}
