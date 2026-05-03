"use client";

import type { SocialBadgeProgressPayload } from "@/lib/social/types";
import { tierAccentClass } from "@/lib/badges/badge-catalog";
import { Panel } from "@/mca-ui/panel";

export type ProfileBadgesPanelProps = {
  block: SocialBadgeProgressPayload;
};

function titleForKey(key: string): string {
  switch (key) {
    case "scan_momentum":
      return "Archive scans";
    case "community_voice":
      return "Community voice";
    case "set_mastery_depth":
      return "Set mastery";
    case "seasonal_presence":
      return "Seasonal rhythm";
    case "club_network":
      return "Club network";
    case "prestige_collector_journey":
      return "Collector prestige";
    default:
      return key.replace(/_/g, " ");
  }
}

export function ProfileBadgesPanel({ block }: ProfileBadgesPanelProps) {
  const tiered = block.rows.filter(
    (r) => r.badgeKey !== "prestige_collector_journey" && r.badgeKey !== "seasonal_presence"
  );
  const prestige = block.rows.filter((r) => r.badgeKey === "prestige_collector_journey");

  return (
    <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
      <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Badge progression</h2>
      <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
        Dynamic tracks across scans, community, mastery, seasons, and clubs — descriptive only, never a
        leaderboard.
      </p>

      {tiered.length > 0 ? (
        <div className="mt-mca-md space-y-mca-sm">
          <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Tracks
          </h3>
          <ul className="flex flex-col gap-mca-xs">
            {tiered.map((r) => (
              <li
                key={r.badgeKey}
                className={`rounded-mca-control border px-mca-sm py-mca-xs text-mca-caption ${tierAccentClass(r.tier)}`}
              >
                <span className="font-medium text-mca-ink-strong">{titleForKey(r.badgeKey)}</span>
                <span className="mx-mca-xs text-mca-ink-subtle">·</span>
                <span>{r.qualitativeLabel}</span>
                {r.seasonLabel ? (
                  <span className="mt-mca-trace block text-mca-ink-muted">{r.seasonLabel}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {block.seasonalBadges.length > 0 ? (
        <div className="mt-mca-md">
          <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Seasonal snapshot
          </h3>
          <ul className="mt-mca-xs space-y-mca-xs text-mca-caption text-mca-ink-body">
            {block.seasonalBadges.map((line, i) => (
              <li key={`s-${i}`}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {prestige.length > 0 ? (
        <div className="mt-mca-md">
          <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Prestige arc
          </h3>
          <ul className="mt-mca-xs space-y-mca-xs text-mca-caption text-mca-ink-body">
            {prestige.map((r) => (
              <li key="prestige-row">{r.qualitativeLabel}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {block.topBadges.length > 0 ? (
        <p className="mt-mca-md text-mca-caption text-mca-ink-muted">
          Highlights · {block.topBadges.slice(0, 3).join(" · ")}
        </p>
      ) : null}
    </Panel>
  );
}
