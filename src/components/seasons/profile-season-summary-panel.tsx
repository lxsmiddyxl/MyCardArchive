"use client";

import { getSeasonCatalogEntry } from "@/lib/seasons/season-catalog";
import type { SocialProfilePayload } from "@/lib/social/types";
import { formatUsdApproxFromCents } from "@/lib/value/value-identity-helpers";
import { cn } from "@/lib/ui/cn";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";
import { memo } from "react";

export type ProfileSeasonSummaryPanelProps = {
  block: NonNullable<SocialProfilePayload["lastSeasonSummary"]>;
  profileUserId: string;
  isSelf: boolean;
  /** Calendar year for the Year-in-Review deep link (defaults to previous UTC year). */
  yearInReviewYear: number;
  className?: string;
};

function asDeckNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

export const ProfileSeasonSummaryPanel = memo(function ProfileSeasonSummaryPanel({
  block,
  profileUserId,
  isSelf,
  yearInReviewYear,
  className,
}: ProfileSeasonSummaryPanelProps) {
  const meta = getSeasonCatalogEntry(block.seasonId);
  const s = block.summary;
  const decks = asDeckNames(s.topDeckNames);
  const cents = s.approxValueCentsEnd;

  return (
    <Panel
      className={cn(
        "rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-mca-standard",
        className
      )}
    >
      <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
      <div className="mt-mca-md flex flex-wrap items-center gap-mca-sm">
        <span className="text-2xl" aria-hidden>
          {meta?.icon ?? "🗓️"}
        </span>
        <div>
          <h2 className="text-xl font-semibold text-mca-ink-strong">
            {meta?.displayName ?? block.seasonId} {block.year} summary
          </h2>
          <p className="text-mca-caption text-mca-ink-muted">
            Aggregated from your activity log and identity pins — UTC season window. Values are approximate.
          </p>
        </div>
      </div>

      <dl className="mt-mca-md grid grid-cols-2 gap-mca-sm text-mca-caption sm:grid-cols-4">
        <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
          <dt className="text-mca-ink-subtle">Scans</dt>
          <dd className="mt-mca-trace text-lg font-semibold tabular-nums">{s.scans ?? 0}</dd>
        </div>
        <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
          <dt className="text-mca-ink-subtle">Binder milestones</dt>
          <dd className="mt-mca-trace text-lg font-semibold tabular-nums">{s.binderCompletions ?? 0}</dd>
        </div>
        <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
          <dt className="text-mca-ink-subtle">Set milestones</dt>
          <dd className="mt-mca-trace text-lg font-semibold tabular-nums">{s.setCompletions ?? 0}</dd>
        </div>
        <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
          <dt className="text-mca-ink-subtle">Seasonal events</dt>
          <dd className="mt-mca-trace text-lg font-semibold tabular-nums">{s.seasonalEvents ?? 0}</dd>
        </div>
      </dl>

      {typeof s.maxStreakInSeason === "number" && s.maxStreakInSeason > 0 ? (
        <p className="mt-mca-sm text-mca-caption text-mca-ink-body">
          Streak snapshot (season): <span className="font-semibold tabular-nums">{s.maxStreakInSeason}</span> days
          logged
        </p>
      ) : null}

      {s.personaSnapshot?.trim() ? (
        <div className="mt-mca-md rounded-mca-control border border-mca-border/60 bg-mca-chrome/15 p-mca-sm">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Persona snapshot</p>
          <p className="mt-mca-xs text-sm text-mca-ink-body">{s.personaSnapshot.trim()}</p>
        </div>
      ) : null}

      {decks.length > 0 ? (
        <div className="mt-mca-md">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Top decks</p>
          <ul className="mt-mca-xs list-inside list-disc text-mca-caption text-mca-ink-muted">
            {decks.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {cents != null && cents > 0 ? (
        <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">
          Collection value (illustrative): {formatUsdApproxFromCents(Number(cents))}
        </p>
      ) : null}

      <div className="mt-mca-md flex flex-wrap gap-mca-sm">
        <Link
          href={`/collector/year-in-review?year=${encodeURIComponent(String(yearInReviewYear))}&userId=${encodeURIComponent(profileUserId)}`}
          className="inline-flex items-center rounded-mca-control border border-mca-border bg-mca-surface/80 px-mca-md py-mca-xs text-mca-caption font-medium text-mca-ink-body shadow-mca-panel transition duration-200 ease-mca-standard hover:bg-mca-surface-elevated"
        >
          Open Year in Review
        </Link>
        {isSelf ? (
          <button
            type="button"
            className="inline-flex items-center rounded-mca-control border border-mca-border/70 px-mca-sm py-mca-xs text-mca-caption text-mca-ink-muted transition duration-200 ease-mca-standard hover:bg-mca-chrome/25"
            onClick={() =>
              void fetch("/api/seasons/summary/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ year: block.year, season: block.seasonId }),
              }).then(() => window.location.reload())
            }
          >
            Regenerate season
          </button>
        ) : null}
      </div>
    </Panel>
  );
});
