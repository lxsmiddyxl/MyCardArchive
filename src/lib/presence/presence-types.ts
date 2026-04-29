/** Aggregate presence lamp — derived from `last_seen_at` only. */
export type PresenceState = "offline" | "online" | "recently_active";

/**
 * Ephemeral coarse activity — matches `user_presence.last_activity` and triggers.
 * `idle` is derived in app layer when activity is missing or stale.
 */
export type ActivityState =
  | "idle"
  | "scanning"
  | "deck_building"
  | "binder_editing"
  | "browsing_sets"
  | "commenting"
  | "liking";

/** Canonical strings stored in Postgres (`touch_user_presence`). */
export const STORED_ACTIVITY_KEYS = [
  "scanning",
  "deck_building",
  "binder_editing",
  "browsing_sets",
  "commenting",
  "liking",
] as const;

export type StoredActivityKey = (typeof STORED_ACTIVITY_KEYS)[number];

export type PresenceTimestamps = {
  lastSeenAt: string | null;
  lastActivityAt: string | null;
};

/** Default thresholds — keep aligned with `derivePresenceState` callers and docs. */
export const PRESENCE_ONLINE_MS = 5 * 60 * 1000;
export const PRESENCE_RECENT_MS = 30 * 60 * 1000;
/** After this without renewal, activity label shows as idle (still may be online/recent). */
export const ACTIVITY_IDLE_AFTER_MS = 15 * 60 * 1000;

export function derivePresenceState(nowMs: number, lastSeenAtIso: string | null | undefined): PresenceState {
  if (!lastSeenAtIso?.trim()) return "offline";
  const t = Date.parse(lastSeenAtIso);
  if (!Number.isFinite(t)) return "offline";
  const delta = nowMs - t;
  if (delta <= PRESENCE_ONLINE_MS) return "online";
  if (delta <= PRESENCE_RECENT_MS) return "recently_active";
  return "offline";
}

export function parseActivityState(raw: string | null | undefined): ActivityState | null {
  if (!raw?.trim()) return null;
  const k = raw.trim();
  if (k === "idle") return "idle";
  if ((STORED_ACTIVITY_KEYS as readonly string[]).includes(k)) return k as ActivityState;
  return null;
}

/**
 * Effective UI activity: stored activity unless stale vs `last_activity_at`, then idle.
 */
export function deriveActivityState(
  nowMs: number,
  storedActivity: string | null | undefined,
  lastActivityAtIso: string | null | undefined
): ActivityState {
  const parsed = parseActivityState(storedActivity);
  if (!parsed || parsed === "idle") return "idle";
  if (!lastActivityAtIso?.trim()) return "idle";
  const t = Date.parse(lastActivityAtIso);
  if (!Number.isFinite(t)) return "idle";
  if (nowMs - t > ACTIVITY_IDLE_AFTER_MS) return "idle";
  return parsed;
}
