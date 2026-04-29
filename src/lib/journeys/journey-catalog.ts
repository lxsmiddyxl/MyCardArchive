/**
 * Collector journey definitions (thresholds & rewards).
 * Keep numeric thresholds aligned with `supabase/migrations/077_user_journey_progress.sql`
 * (`refresh_user_journey_progress`).
 */

export type JourneyCategory = "scanning" | "collection" | "social" | "streak" | "seasonal";

/** Inputs needed to evaluate journeys — mirrors SQL aggregates in refresh_user_journey_progress. */
export type JourneyUserContext = {
  scanCount: number;
  binderCount: number;
  /** Distinct catalog set ids represented in the user’s linked cards. */
  distinctCatalogSetCount: number;
  streakCount: number;
  reputationScore: number;
  hasSeasonalBadge: boolean;
};

export type JourneyProgressEval = {
  completedSteps: number;
  isComplete: boolean;
};

export type JourneyCatalogEntry = {
  journeyId: string;
  displayName: string;
  description: string;
  category: JourneyCategory;
  totalSteps: number;
  badgeKey?: string;
  /** Flair key merged into earned flairs when the journey completes (server-evaluated). */
  rewardFlairKey?: string;
  progressEvaluator: (ctx: JourneyUserContext) => JourneyProgressEval;
};

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(max, Math.floor(n)));
}

export const JOURNEY_CATALOG: JourneyCatalogEntry[] = [
  {
    journeyId: "first_50_scans",
    displayName: "Scan 50 cards",
    description: "Record 50 scans in MyCardArchive — a steady start for any collector.",
    category: "scanning",
    totalSteps: 50,
    badgeKey: "journey_scan_50",
    rewardFlairKey: "journey_flair_scan_rookie",
    progressEvaluator(ctx) {
      const completedSteps = clamp(ctx.scanCount, 50);
      return { completedSteps, isComplete: ctx.scanCount >= 50 };
    },
  },
  {
    journeyId: "first_500_scans",
    displayName: "Scan 500 cards",
    description: "Reach 500 recorded scans — you clearly love the capture flow.",
    category: "scanning",
    totalSteps: 500,
    badgeKey: "journey_scan_500",
    rewardFlairKey: "journey_flair_scan_veteran",
    progressEvaluator(ctx) {
      const completedSteps = clamp(ctx.scanCount, 500);
      return { completedSteps, isComplete: ctx.scanCount >= 500 };
    },
  },
  {
    journeyId: "first_binder_complete",
    displayName: "Complete your first binder",
    description: "Create at least one binder to organize your collection.",
    category: "collection",
    totalSteps: 1,
    badgeKey: "journey_first_binder",
    rewardFlairKey: "journey_flair_binder_started",
    progressEvaluator(ctx) {
      const completedSteps = ctx.binderCount >= 1 ? 1 : 0;
      return { completedSteps, isComplete: ctx.binderCount >= 1 };
    },
  },
  {
    journeyId: "ten_unique_sets",
    displayName: "Log 10 unique sets",
    description: "Link cards from 10 different catalog sets — breadth across the hobby.",
    category: "collection",
    totalSteps: 10,
    badgeKey: "journey_ten_sets",
    rewardFlairKey: "journey_flair_set_explorer",
    progressEvaluator(ctx) {
      const completedSteps = clamp(ctx.distinctCatalogSetCount, 10);
      return { completedSteps, isComplete: ctx.distinctCatalogSetCount >= 10 };
    },
  },
  {
    journeyId: "seven_day_streak",
    displayName: "Reach a 7-day streak",
    description: "Keep a 7-day UTC activity streak with scans, posts, comments, or likes.",
    category: "streak",
    totalSteps: 7,
    rewardFlairKey: "journey_flair_streak_week",
    progressEvaluator(ctx) {
      const completedSteps = clamp(ctx.streakCount, 7);
      return { completedSteps, isComplete: ctx.streakCount >= 7 };
    },
  },
  {
    journeyId: "first_seasonal_badge",
    displayName: "Earn your first seasonal badge",
    description: "Participate during a live seasonal window and earn a limited seasonal badge.",
    category: "seasonal",
    totalSteps: 1,
    badgeKey: "journey_first_seasonal",
    progressEvaluator(ctx) {
      const completedSteps = ctx.hasSeasonalBadge ? 1 : 0;
      return { completedSteps, isComplete: ctx.hasSeasonalBadge };
    },
  },
  {
    journeyId: "thousand_reputation",
    displayName: "Reach 1,000 reputation",
    description: "Hit 1,000 reputation from posts, comments, likes received, and scans.",
    category: "social",
    totalSteps: 1,
    badgeKey: "journey_rep_1000",
    rewardFlairKey: "journey_flair_reputed",
    progressEvaluator(ctx) {
      const completedSteps = ctx.reputationScore >= 1000 ? 1 : 0;
      return { completedSteps, isComplete: ctx.reputationScore >= 1000 };
    },
  },
];

const BY_ID = new Map(JOURNEY_CATALOG.map((j) => [j.journeyId, j]));

export function getJourneyCatalogEntry(journeyId: string): JourneyCatalogEntry | undefined {
  return BY_ID.get(journeyId);
}

export function evaluateAllJourneys(ctx: JourneyUserContext): Map<string, JourneyProgressEval> {
  const m = new Map<string, JourneyProgressEval>();
  for (const j of JOURNEY_CATALOG) {
    m.set(j.journeyId, j.progressEvaluator(ctx));
  }
  return m;
}

export type JourneyProgressDbRow = {
  journey_id: string;
  completed_steps: number;
  is_complete: boolean;
  completed_at: string | null;
};

export type JourneyProfileRow = {
  journeyId: string;
  displayName: string;
  description: string;
  category: JourneyCategory;
  totalSteps: number;
  completedSteps: number;
  isComplete: boolean;
  completedAt: string | null;
  badgeKey?: string;
  rewardFlairKey?: string;
};

/** Full catalog with DB progress (missing rows → zero progress). */
export function buildFullJourneyProfileRows(dbRows: JourneyProgressDbRow[]): JourneyProfileRow[] {
  const byId = new Map(dbRows.map((r) => [r.journey_id, r]));
  return JOURNEY_CATALOG.map((meta) => {
    const r = byId.get(meta.journeyId);
    const completedSteps = r?.completed_steps ?? 0;
    const isComplete = r?.is_complete ?? false;
    const completedAt = r?.completed_at ?? null;
    return {
      journeyId: meta.journeyId,
      displayName: meta.displayName,
      description: meta.description,
      category: meta.category,
      totalSteps: meta.totalSteps,
      completedSteps,
      isComplete,
      completedAt,
      badgeKey: meta.badgeKey,
      rewardFlairKey: isComplete ? meta.rewardFlairKey : undefined,
    };
  });
}

export function splitActiveAndCompleted(rows: JourneyProfileRow[]): {
  active: JourneyProfileRow[];
  completed: JourneyProfileRow[];
} {
  const active = rows.filter((r) => !r.isComplete).sort((a, b) => a.journeyId.localeCompare(b.journeyId));
  const completed = rows.filter((r) => r.isComplete).sort((a, b) => a.journeyId.localeCompare(b.journeyId));
  return { active, completed };
}

/** Prefer an in-progress journey with a badge preview; otherwise first completed journey with a badge (catalog order). */
export function pickTopJourneyBadgeKey(rows: JourneyProgressDbRow[]): string | null {
  const byId = new Map(rows.map((r) => [r.journey_id, r]));
  for (const j of JOURNEY_CATALOG) {
    if (!j.badgeKey) continue;
    const r = byId.get(j.journeyId);
    const steps = r?.completed_steps ?? 0;
    const complete = r?.is_complete ?? false;
    if (!complete && steps > 0) return j.badgeKey;
  }
  for (const j of JOURNEY_CATALOG) {
    if (!j.badgeKey) continue;
    const r = byId.get(j.journeyId);
    if (r?.is_complete) return j.badgeKey;
  }
  return null;
}

export function buildJourneyProgressSummary(rows: JourneyProgressDbRow[]): string | null {
  if (rows.length === 0) return null;
  const done = rows.filter((r) => r.is_complete).length;
  return `${done}/${JOURNEY_CATALOG.length} journeys complete`;
}

/** Flair keys from completed journeys (catalog), merged into earned flairs on profile. */
export function journeyRewardFlairKeysFromRows(rows: JourneyProgressDbRow[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (!r.is_complete) continue;
    const k = getJourneyCatalogEntry(r.journey_id)?.rewardFlairKey?.trim();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}
