import type { UserFlairEnrichment } from "@/lib/flair/enrich-user-flair-batch";
import type { SocialPresenceSnapshot } from "@/lib/social/types";

/** Serializable presence snapshot for API responses (no spoofing — server-derived only). */
export function presenceFieldsFromFlair(fx: UserFlairEnrichment | undefined): {
  lastSeenAt: string | null;
  lastActivityAt: string | null;
  lastActivityKey: string | null;
  presenceOptOut: boolean;
} {
  return {
    lastSeenAt: fx?.lastSeenAt ?? null,
    lastActivityAt: fx?.lastActivityAt ?? null,
    lastActivityKey: fx?.lastActivityKey ?? null,
    presenceOptOut: fx?.presenceOptOut ?? false,
  };
}

/** Same shape as `SocialProfilePayload.presence` rows (for feed / community / strips). */
export function presenceSnapshotFromFlair(fx: UserFlairEnrichment | undefined): SocialPresenceSnapshot {
  const p = presenceFieldsFromFlair(fx);
  return {
    optedOut: p.presenceOptOut,
    lastSeenAt: p.lastSeenAt,
    lastActivityAt: p.lastActivityAt,
    lastActivityKey: p.lastActivityKey,
  };
}
