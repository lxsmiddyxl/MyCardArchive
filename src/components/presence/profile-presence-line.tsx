"use client";

import { formatProfilePresenceLine } from "@/lib/presence/presence-labels";
import type { SocialPresenceSnapshot } from "@/lib/social/types";
import { useEffect, useMemo, useState } from "react";

export function ProfilePresenceLine({ presence }: { presence: SocialPresenceSnapshot }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const text = useMemo(() => {
    if (presence.optedOut) {
      return "Presence is hidden.";
    }
    return formatProfilePresenceLine({
      nowMs,
      lastSeenAtIso: presence.lastSeenAt,
      storedActivity: presence.lastActivityKey,
      lastActivityAtIso: presence.lastActivityAt,
    });
  }, [nowMs, presence]);

  return <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">{text}</p>;
}
