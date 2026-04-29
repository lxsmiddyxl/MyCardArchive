"use client";

import { TrainerPresencePill } from "@/components/presence/trainer-presence-dot";
import { useAppWidePresenceOptional } from "@/components/realtime/app-wide-presence";
import type { SocialPresenceSnapshot } from "@/lib/social/types";
import { memo, useEffect, useState } from "react";

type Props = {
  subjectUserId: string;
  /** Server-backed presence row when available (preferred over app-wide live socket). */
  presence: SocialPresenceSnapshot | null;
};

/**
 * Online / active lamp for the profile subject. Uses `user_presence` when loaded; falls back to
 * app-wide Realtime presence when the subtree is under {@link AuthenticatedPresenceShell}.
 */
export const ProfileSubjectPresence = memo(function ProfileSubjectPresence({
  subjectUserId,
  presence,
}: Props) {
  const appWide = useAppWidePresenceOptional();
  const [fallbackOnline, setFallbackOnline] = useState(false);

  useEffect(() => {
    if (!appWide || appWide.unavailable || presence) {
      setFallbackOnline(false);
      return;
    }
    setFallbackOnline(appWide.isUserOnline(subjectUserId));
  }, [appWide, presence, subjectUserId, appWide?.version]);

  if (presence) {
    return (
      <TrainerPresencePill
        lastSeenAt={presence.lastSeenAt}
        lastActivityAt={presence.lastActivityAt}
        lastActivityKey={presence.lastActivityKey}
        presenceOptOut={presence.optedOut}
      />
    );
  }

  if (!appWide || appWide.unavailable) {
    return null;
  }

  return (
    <TrainerPresencePill
      lastSeenAt={null}
      lastActivityAt={null}
      lastActivityKey={null}
      presenceOptOut={false}
      fallbackOnline={fallbackOnline}
    />
  );
});
