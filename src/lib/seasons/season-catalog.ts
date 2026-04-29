/**
 * Meteorological seasons (UTC). Winter is anchored to the January year
 * (Winter 2026 = Dec 2025 through Feb 2026).
 */

export const SEASON_IDS = ["spring", "summer", "fall", "winter"] as const;
export type SeasonId = (typeof SEASON_IDS)[number];

export type SeasonCatalogEntry = {
  seasonId: SeasonId;
  displayName: string;
  /** Inclusive month numbers 1–12 for the portion that falls in the anchor calendar year (winter uses 1–2 and 12). */
  startMonth: number;
  endMonth: number;
  icon: string;
  colorToken: string;
};

export const SEASON_CATALOG: Record<SeasonId, SeasonCatalogEntry> = {
  spring: {
    seasonId: "spring",
    displayName: "Spring",
    startMonth: 3,
    endMonth: 5,
    icon: "🌸",
    colorToken: "emerald-400",
  },
  summer: {
    seasonId: "summer",
    displayName: "Summer",
    startMonth: 6,
    endMonth: 8,
    icon: "☀️",
    colorToken: "amber-400",
  },
  fall: {
    seasonId: "fall",
    displayName: "Fall",
    startMonth: 9,
    endMonth: 11,
    icon: "🍂",
    colorToken: "orange-500",
  },
  winter: {
    seasonId: "winter",
    displayName: "Winter",
    startMonth: 12,
    endMonth: 2,
    icon: "❄️",
    colorToken: "sky-400",
  },
};

/** Anchor calendar year for a season (matches DB `user_season_summaries.year`). */
export type SeasonForDate = {
  seasonId: SeasonId;
  year: number;
};

/**
 * Returns the season + anchor year for a UTC calendar date.
 * Winter Y includes December of Y-1 and January–February of Y.
 */
export function getSeasonForDate(d: Date): SeasonForDate {
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const m = utc.getUTCMonth() + 1;
  const y = utc.getUTCFullYear();

  if (m === 12) {
    return { seasonId: "winter", year: y + 1 };
  }
  if (m <= 2) {
    return { seasonId: "winter", year: y };
  }
  if (m <= 5) {
    return { seasonId: "spring", year: y };
  }
  if (m <= 8) {
    return { seasonId: "summer", year: y };
  }
  return { seasonId: "fall", year: y };
}

/** The season that most recently ended before `d` (for “last completed” summaries). */
export function getLastCompletedSeasonForDate(d: Date): SeasonForDate {
  const cur = getSeasonForDate(d);
  switch (cur.seasonId) {
    case "spring":
      return { seasonId: "winter", year: cur.year };
    case "summer":
      return { seasonId: "spring", year: cur.year };
    case "fall":
      return { seasonId: "summer", year: cur.year };
    case "winter":
      return { seasonId: "fall", year: cur.year };
    default:
      return cur;
  }
}

export function getSeasonCatalogEntry(id: string): SeasonCatalogEntry | null {
  const k = id as SeasonId;
  return SEASON_CATALOG[k] ?? null;
}
