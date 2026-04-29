"use client";

import { presenceLampTitle } from "@/lib/presence/presence-labels";
import {
  deriveActivityState,
  derivePresenceState,
  type ActivityState,
  type PresenceState,
} from "@/lib/presence/presence-types";
import { cn } from "@/lib/ui/cn";
import { useEffect, useMemo, useState } from "react";

export type TrainerPresenceDotProps = {
  lastSeenAt?: string | null;
  lastActivityAt?: string | null;
  lastActivityKey?: string | null;
  presenceOptOut?: boolean;
  className?: string;
};

export function TrainerPresenceDot({
  lastSeenAt,
  lastActivityAt,
  lastActivityKey,
  presenceOptOut,
  className,
}: TrainerPresenceDotProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { title, dotClass } = useMemo(() => {
    if (presenceOptOut) {
      return {
        title: "Presence hidden",
        dotClass: "bg-mca-ink-muted/35",
      };
    }
    const presenceState = derivePresenceState(nowMs, lastSeenAt ?? null);
    const activityState = deriveActivityState(nowMs, lastActivityKey ?? null, lastActivityAt ?? null);
    const titleInner = presenceLampTitle({
      nowMs,
      presenceState,
      activity: activityState as ActivityState,
      lastSeenAtIso: lastSeenAt ?? null,
    });
    const dotClassInner =
      presenceState === "online"
        ? "bg-emerald-500 shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
        : presenceState === "recently_active"
          ? "bg-amber-400 shadow-[0_0_0_1px_rgba(0,0,0,0.12)]"
          : "bg-mca-ink-muted/45";
    return { title: titleInner, dotClass: dotClassInner };
  }, [nowMs, lastSeenAt, lastActivityAt, lastActivityKey, presenceOptOut]);

  return (
    <span
      title={title}
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", dotClass, className)}
      aria-hidden
    />
  );
}

/** Compact pill with dot — optional label for profile header. */
export function TrainerPresencePill(props: TrainerPresenceDotProps & { fallbackOnline?: boolean }) {
  const { fallbackOnline, ...rest } = props;
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const { label, title, dotClass } = useMemo(() => {
    if (rest.presenceOptOut) {
      return { label: "Hidden", title: "Presence hidden", dotClass: "bg-mca-ink-muted/35" };
    }
    if (
      !rest.lastSeenAt?.trim() &&
      fallbackOnline !== undefined &&
      !rest.lastActivityKey &&
      !rest.lastActivityAt
    ) {
      const ps: PresenceState = fallbackOnline ? "online" : "offline";
      const titleInner =
        ps === "online" ? "Online now (live session)" : "Away (live session)";
      const dotClassInner = fallbackOnline ? "bg-emerald-500" : "bg-mca-ink-muted/45";
      return { label: ps === "online" ? "Online" : "Away", title: titleInner, dotClass: dotClassInner };
    }
    const presenceState = derivePresenceState(nowMs, rest.lastSeenAt ?? null);
    const activityState = deriveActivityState(
      nowMs,
      rest.lastActivityKey ?? null,
      rest.lastActivityAt ?? null
    );
    const titleInner = presenceLampTitle({
      nowMs,
      presenceState,
      activity: activityState as ActivityState,
      lastSeenAtIso: rest.lastSeenAt ?? null,
    });
    const dotClassInner =
      presenceState === "online"
        ? "bg-emerald-500"
        : presenceState === "recently_active"
          ? "bg-amber-400"
          : "bg-mca-ink-muted/45";
    const labelInner =
      presenceState === "online" ? "Online" : presenceState === "recently_active" ? "Active" : "Away";
    return { label: labelInner, title: titleInner, dotClass: dotClassInner };
  }, [nowMs, rest, fallbackOnline]);

  return (
    <span
      title={title}
      className="inline-flex items-center gap-mca-xs rounded-mca-control border border-mca-border/80 bg-mca-surface-elevated/40 px-mca-sm py-mca-micro text-mca-caption text-mca-ink-muted"
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dotClass)} aria-hidden />
      {label}
    </span>
  );
}
