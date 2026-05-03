import type { ActivityState, PresenceState } from "@/lib/presence/presence-types";
import {
  ACTIVITY_IDLE_AFTER_MS,
  deriveActivityState,
  derivePresenceState,
  PRESENCE_ONLINE_MS,
  PRESENCE_RECENT_MS,
} from "@/lib/presence/presence-types";

/**
 * Qualitative windows only — no minute/hour stamps (Phase 25 privacy bar).
 */
export function qualitativePresenceWindow(nowMs: number, lastSeenAtIso: string | null | undefined): string {
  if (!lastSeenAtIso?.trim()) return "Away";
  const t = Date.parse(lastSeenAtIso);
  if (!Number.isFinite(t)) return "Away";
  const delta = nowMs - t;
  if (delta <= PRESENCE_ONLINE_MS) return "Active now";
  if (delta <= PRESENCE_RECENT_MS) return "Active recently";
  const seenDay = new Date(t).toISOString().slice(0, 10);
  const todayDay = new Date(nowMs).toISOString().slice(0, 10);
  if (seenDay === todayDay) return "Active today";
  return "Away";
}

/** @deprecated Prefer qualitativePresenceWindow — bucket labels without precise deltas. */
export function formatRelativePresenceShort(nowMs: number, lastSeenAtIso: string | null | undefined): string {
  return qualitativePresenceWindow(nowMs, lastSeenAtIso);
}

export function activityVerbLabel(activity: ActivityState): string | null {
  switch (activity) {
    case "idle":
      return null;
    case "scanning":
      return "Scanning now";
    case "deck_building":
      return "Building a deck";
    case "binder_editing":
      return "Editing a binder";
    case "browsing_sets":
      return "Browsing sets";
    case "commenting":
      return "Commenting";
    case "liking":
      return "Reacting";
    default:
      return null;
  }
}

export function presenceLampTitle(args: {
  nowMs: number;
  presenceState: PresenceState;
  activity: ActivityState;
  lastSeenAtIso: string | null | undefined;
}): string {
  const verb = activityVerbLabel(args.activity);
  const win = qualitativePresenceWindow(args.nowMs, args.lastSeenAtIso);
  if (args.presenceState === "online") {
    return verb ? `${verb} · ${win}` : win;
  }
  if (args.presenceState === "recently_active") {
    return verb ? `${verb} · ${win}` : win;
  }
  return verb ? `${verb} · ${win}` : win;
}

/** Single line under profile persona — rounded language only. */
export function formatProfilePresenceLine(args: {
  nowMs: number;
  lastSeenAtIso: string | null | undefined;
  storedActivity: string | null | undefined;
  lastActivityAtIso: string | null | undefined;
}): string {
  const presence = derivePresenceState(args.nowMs, args.lastSeenAtIso);
  const activity = deriveActivityState(args.nowMs, args.storedActivity, args.lastActivityAtIso);
  const verb = activityVerbLabel(activity);
  const win = qualitativePresenceWindow(args.nowMs, args.lastSeenAtIso);

  if (presence === "online") {
    return verb ? `${verb} · ${win}` : win;
  }
  if (presence === "recently_active") {
    return verb ? `${verb} · ${win}` : win;
  }
  return verb ? `Away · ${verb}` : win;
}

/** One-line enrichment / API — qualitative only. */
export function buildPresenceQualitativeLabel(args: {
  nowMs: number;
  presenceOptOut: boolean;
  lastSeenAtIso: string | null | undefined;
  presenceState: PresenceState;
  activityState: ActivityState;
}): string | null {
  if (args.presenceOptOut) return "Presence hidden";
  const verb = activityVerbLabel(args.activityState);
  const win = qualitativePresenceWindow(args.nowMs, args.lastSeenAtIso);
  if (verb && args.presenceState !== "offline") {
    return `${verb} · ${win}`;
  }
  return win;
}
