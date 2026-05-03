"use client";

import { TrainerPresenceDot } from "@/components/presence/trainer-presence-dot";
import { formatProfilePresenceLine, qualitativePresenceWindow } from "@/lib/presence/presence-labels";
import type { PresenceDTO } from "@/lib/dto/social-profile";
import { useEffect, useMemo, useState } from "react";

export type ProfilePresenceIndicatorProps = {
  presence: PresenceDTO | null;
  /** Server-derived qualitative line (Phase 25 enrichment). */
  presenceLabel?: string | null;
};

/**
 * Profile-only presence block: lamp dot, qualitative label, and coarse activity window.
 * No exact timestamps — aligns with Phase 25 privacy bar.
 */
export function ProfilePresenceIndicator({ presence, presenceLabel }: ProfilePresenceIndicatorProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { headline, windowLine } = useMemo(() => {
    if (!presence) {
      return {
        headline: presenceLabel?.trim() ?? "",
        windowLine: "" as string,
      };
    }
    if (presence.optedOut) {
      return { headline: "Presence hidden", windowLine: "" };
    }
    const trimmed = presenceLabel?.trim();
    const fallbackLine = formatProfilePresenceLine({
      nowMs,
      lastSeenAtIso: presence.lastSeenAt,
      storedActivity: presence.lastActivityKey,
      lastActivityAtIso: presence.lastActivityAt,
    });
    const winOnly = qualitativePresenceWindow(nowMs, presence.lastSeenAt);
    if (!trimmed) {
      return { headline: fallbackLine, windowLine: "" };
    }
    const sub =
      winOnly && trimmed !== fallbackLine && !trimmed.includes(winOnly)
        ? winOnly
        : trimmed.includes(" · ") || trimmed === winOnly
          ? ""
          : winOnly;
    return { headline: trimmed, windowLine: sub };
  }, [nowMs, presence, presenceLabel]);

  if (!headline) return null;

  return (
    <div className="mt-mca-xs flex items-start gap-mca-sm">
      {presence && !presence.optedOut ? (
        <TrainerPresenceDot
          lastSeenAt={presence.lastSeenAt}
          lastActivityAt={presence.lastActivityAt}
          lastActivityKey={presence.lastActivityKey}
          presenceOptOut={presence.optedOut}
          className="mt-mca-micro"
        />
      ) : (
        <span
          className="mt-mca-micro inline-block h-2 w-2 shrink-0 rounded-full bg-mca-ink-muted/35"
          aria-hidden
        />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug text-mca-ink-body">{headline}</p>
        {windowLine ? (
          <p className="mt-mca-trace text-mca-caption text-mca-ink-subtle">{windowLine}</p>
        ) : null}
      </div>
    </div>
  );
}
