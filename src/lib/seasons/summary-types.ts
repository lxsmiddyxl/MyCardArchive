/** Subset of `user_season_summaries.summary_json` used by the client. */
export type SeasonSummaryJsonV1 = {
  version?: number;
  seasonId?: string;
  year?: number;
  /** One-line strip for feed / mutuals. */
  highlight?: string;
  scans?: number;
  binderCompletions?: number;
  setCompletions?: number;
  seasonalEvents?: number;
  journeyCompletions?: number;
  streakUpdates?: number;
  maxStreakInSeason?: number | null;
  valueRefreshEvents?: number;
  /** Approximate end snapshot only — not financial advice. */
  approxValueCentsEnd?: number | null;
  valueDisclaimer?: string;
  fandomPins?: Record<string, string | null>;
  playSnapshot?: {
    favoriteFormatId?: string | null;
    favoriteArchetypeId?: string | null;
    favoriteDeckName?: string | null;
  };
  topDeckNames?: string[];
  personaSnapshot?: string | null;
  rangeStart?: string;
  rangeEnd?: string;
};

/** Subset of `user_year_in_review.summary_json`. */
export type YearInReviewJsonV1 = {
  version?: number;
  year?: number;
  highlight?: string;
  totalActivities?: number;
  topMonths?: { month: number; label: string; count: number }[];
  biggestStreak?: number | null;
  firsts?: Record<string, string | null>;
  topFandomPins?: Record<string, string | null>;
  topDeckNames?: string[];
  grailAddsInYear?: number;
  valueRefreshEvents?: number;
  approxValueCentsEnd?: number | null;
  valueDisclaimer?: string;
  personaEvolution?: {
    startPersona?: string | null;
    endPersona?: string | null;
    note?: string | null;
  };
  collectorTitle?: string;
};
