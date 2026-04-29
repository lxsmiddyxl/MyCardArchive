import type { Database } from "@/lib/supabase/types";
import type { ActivityState, PresenceState } from "@/lib/presence/presence-types";
import {
  deriveActivityState,
  derivePresenceState,
} from "@/lib/presence/presence-types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type UserPresenceRow = {
  presenceState: PresenceState;
  activityState: ActivityState;
  lastSeenAt: string | null;
  lastActivityAt: string | null;
  /** Raw DB activity key before idle derivation — omit from UI. */
  lastActivityRaw: string | null;
  presenceOptOut: boolean;
};

function emptyPresence(): UserPresenceRow {
  return {
    presenceState: "offline",
    activityState: "idle",
    lastSeenAt: null,
    lastActivityAt: null,
    lastActivityRaw: null,
    presenceOptOut: false,
  };
}

function parseRow(
  raw: Record<string, unknown>,
  nowMs: number
): UserPresenceRow {
  const optOut = Boolean(raw.presence_opt_out ?? raw.presenceOptOut);
  if (optOut) {
    return {
      presenceState: "offline",
      activityState: "idle",
      lastSeenAt: null,
      lastActivityAt: null,
      lastActivityRaw: null,
      presenceOptOut: true,
    };
  }
  const lastSeenAt =
    raw.last_seen_at != null ? String(raw.last_seen_at) : null;
  const lastActivityAt =
    raw.last_activity_at != null ? String(raw.last_activity_at) : null;
  const lastActivity =
    raw.last_activity != null ? String(raw.last_activity) : null;

  const presenceState = derivePresenceState(nowMs, lastSeenAt);
  const activityState = deriveActivityState(nowMs, lastActivity, lastActivityAt);

  return {
    presenceState,
    activityState,
    lastSeenAt,
    lastActivityAt,
    lastActivityRaw: lastActivity,
    presenceOptOut: false,
  };
}

/** Server-side batch read — pairs with `get_users_presence_batch` RPC. */
export async function loadSocialPresenceByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, UserPresenceRow>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  const nowMs = Date.now();
  const out: Record<string, UserPresenceRow> = Object.fromEntries(
    unique.map((id) => [id, emptyPresence()])
  );
  if (unique.length === 0) return out;

  const { data, error } = await supabase.rpc("get_users_presence_batch", {
    p_user_ids: unique,
  });

  if (error || !Array.isArray(data)) {
    return out;
  }

  for (const row of data as Record<string, unknown>[]) {
    const uid = String(row.user_id ?? "");
    if (!uid || !(uid in out)) continue;
    out[uid] = parseRow(row, nowMs);
  }
  return out;
}
