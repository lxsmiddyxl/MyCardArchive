import type { ActivityState, PresenceState } from "@/lib/presence/presence-types";
import {
  ACTIVITY_IDLE_AFTER_MS,
  deriveActivityState,
  derivePresenceState,
} from "@/lib/presence/presence-types";

/** Rounded relative time for privacy — never exposes exact clock. */
export function formatRelativePresenceShort(nowMs: number, lastSeenAtIso: string | null | undefined): string {
  if (!lastSeenAtIso?.trim()) return "Unknown";
  const t = Date.parse(lastSeenAtIso);
  if (!Number.isFinite(t)) return "Unknown";
  const sec = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (sec < 60) return "Active just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `Active ${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `Active ${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `Active ${day}d ago`;
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
  if (args.presenceState === "online") {
    return verb ? `${verb} · Online now` : "Online now";
  }
  if (args.presenceState === "recently_active") {
    const rel = formatRelativePresenceShort(args.nowMs, args.lastSeenAtIso);
    return verb ? `${verb} · ${rel}` : rel;
  }
  const rel = formatRelativePresenceShort(args.nowMs, args.lastSeenAtIso);
  return verb ? `${verb} · Appears offline · ${rel}` : `Offline · ${rel}`;
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
  const rel = formatRelativePresenceShort(args.nowMs, args.lastSeenAtIso);

  if (presence === "online") {
    return verb ? `${verb} · Online now` : "Online now";
  }
  if (presence === "recently_active") {
    return verb ? `${verb} · ${rel}` : rel;
  }
  return verb ? `Away · ${verb} · ${rel}` : `Away · ${rel}`;
}
