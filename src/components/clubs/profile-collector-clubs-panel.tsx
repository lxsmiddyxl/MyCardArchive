"use client";

import { getClubById } from "@/lib/clubs/club-catalog";
import type { SocialProfilePayload } from "@/lib/social/types";
import { cn } from "@/lib/ui/cn";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { memo } from "react";

const CLUB_CHIP_RING: Record<string, string> = {
  "mca-accent-strong": "border-mca-accent-strong/50 ring-1 ring-mca-accent-strong/25",
  "mca-warn": "border-mca-warn/50 ring-1 ring-mca-warn/20",
  "mca-ok": "border-mca-ok/50 ring-1 ring-mca-ok/20",
  "mca-accent": "border-mca-accent/50 ring-1 ring-mca-accent/20",
  "mca-gold": "border-amber-400/50 ring-1 ring-amber-300/20",
  "mca-ink-strong": "border-mca-ink-strong/35 ring-1 ring-mca-border/30",
  "mca-accent-soft": "border-mca-accent-soft/50 ring-1 ring-mca-accent-soft/20",
};

export type ProfileCollectorClubsPanelProps = {
  clubs: NonNullable<SocialProfilePayload["clubs"]>;
  primaryClubId: string | null | undefined;
  className?: string;
};

export const ProfileCollectorClubsPanel = memo(function ProfileCollectorClubsPanel({
  clubs,
  primaryClubId,
  className,
}: ProfileCollectorClubsPanelProps) {
  if (!clubs.length) return null;

  return (
    <Panel
      className={cn(
        "rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-mca-standard",
        className
      )}
    >
      <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
      <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Collector clubs</h2>
      <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
        Lightweight cohorts from your public play, fandom, collection, trades, and seasonal signals — auto
        assigned, non-exclusive, and not competitive.
      </p>
      <ul className="mt-mca-md flex flex-wrap gap-mca-sm">
        {clubs.map((c) => {
          const meta = getClubById(c.clubId);
          const ring = meta?.colorToken ? CLUB_CHIP_RING[meta.colorToken] ?? "" : "";
          const isPrimary = primaryClubId === c.clubId;
          return (
            <li key={c.clubId}>
              <Link
                href={`/clubs/${encodeURIComponent(c.clubId)}`}
                className={cn(
                  "inline-flex items-center gap-mca-xs rounded-full border border-mca-border/80 bg-mca-surface/50 px-mca-sm py-mca-xs text-mca-caption font-medium text-mca-ink-body transition motion-safe:duration-200 motion-safe:ease-mca-standard hover:border-mca-accent-strong/40 hover:bg-mca-chrome/40",
                  isPrimary && "border-mca-accent-strong/60 bg-mca-accent-strong/10",
                  isPrimary && ring
                )}
              >
                <span aria-hidden>{meta?.icon ?? "◇"}</span>
                <span>{c.displayName}</span>
                <span className="sr-only">View club roster</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
});
