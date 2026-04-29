/**
 * Activity types for `user_activity_log` and collector timeline.
 * Keep labels privacy-safe — no private card names in public surfaces without explicit consent.
 */

export const ACTIVITY_TYPES = [
  "scan",
  "deck_edit",
  "binder_edit",
  "binder_complete",
  "set_complete",
  "streak_update",
  "seasonal_event",
  "journey_complete",
  "trade_feedback",
  "value_refresh",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type ActivityCatalogEntry = {
  type: ActivityType;
  displayName: string;
  /** Emoji / single glyph for timeline rows */
  icon: string;
  /** Tailwind-friendly token fragment (e.g. `mca-accent-strong`) */
  colorToken: string;
};

export const ACTIVITY_CATALOG: Record<ActivityType, ActivityCatalogEntry> = {
  scan: {
    type: "scan",
    displayName: "Card scan",
    icon: "📷",
    colorToken: "mca-accent-strong",
  },
  deck_edit: {
    type: "deck_edit",
    displayName: "Deck edit",
    icon: "🃏",
    colorToken: "mca-accent",
  },
  binder_edit: {
    type: "binder_edit",
    displayName: "Binder edit",
    icon: "📒",
    colorToken: "mca-ink-body",
  },
  binder_complete: {
    type: "binder_complete",
    displayName: "Binder completed",
    icon: "✅",
    colorToken: "emerald-500",
  },
  set_complete: {
    type: "set_complete",
    displayName: "Set mastered",
    icon: "🎯",
    colorToken: "amber-400",
  },
  streak_update: {
    type: "streak_update",
    displayName: "Activity streak",
    icon: "🔥",
    colorToken: "orange-400",
  },
  seasonal_event: {
    type: "seasonal_event",
    displayName: "Seasonal event",
    icon: "🎊",
    colorToken: "violet-400",
  },
  journey_complete: {
    type: "journey_complete",
    displayName: "Journey completed",
    icon: "🧭",
    colorToken: "sky-400",
  },
  trade_feedback: {
    type: "trade_feedback",
    displayName: "Trade feedback",
    icon: "🤝",
    colorToken: "teal-400",
  },
  value_refresh: {
    type: "value_refresh",
    displayName: "Collection value update",
    icon: "💎",
    colorToken: "mca-ink-muted",
  },
};

/** Types surfaced on the vertical milestone timeline (subset / emphasis). */
const TIMELINE_TYPES = new Set<ActivityType>([
  "scan",
  "binder_complete",
  "set_complete",
  "seasonal_event",
  "journey_complete",
  "trade_feedback",
  "value_refresh",
  "streak_update",
]);

export function isTimelineActivityType(t: string | null | undefined): t is ActivityType {
  if (!t) return false;
  return TIMELINE_TYPES.has(t as ActivityType);
}

export function getActivityCatalogEntry(type: string): ActivityCatalogEntry | null {
  const k = type as ActivityType;
  return ACTIVITY_CATALOG[k] ?? null;
}
