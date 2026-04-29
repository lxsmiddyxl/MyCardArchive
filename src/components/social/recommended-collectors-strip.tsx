"use client";

import { InlineUserBadges } from "@/components/badges/inline-user-badges";
import { InlineUserFlair } from "@/components/flair/inline-user-flair";
import { TrainerPresenceDot } from "@/components/presence/trainer-presence-dot";
import { InlineSeasonalEvent } from "@/components/seasonal/inline-seasonal-event";
import { buildInlineIdentityProgressTitle } from "@/lib/social/inline-identity-tooltip";
import { Panel } from "@/mca-ui/panel";
import Image from "next/image";
import Link from "next/link";
import { memo, useEffect, useState } from "react";

type CollectorRow = {
  userId: string;
  similarityScore: number;
  traitsTooltip: string | null;
  username: string | null;
  avatarUrl: string | null;
  tierSlug?: string | null;
  topScanMilestone?: string | null;
  personaText?: string | null;
  topFlairKey?: string | null;
  topSeasonalFlairKey?: string | null;
  topSeasonalBadgeKey?: string | null;
  topJourneyBadgeKey?: string | null;
  topCollectionMasteryBadgeKey?: string | null;
  topTradeBadgeKey?: string | null;
  topPlayBadgeKey?: string | null;
  secondaryPlayFlairKey?: string | null;
  topValueBadgeKey?: string | null;
  topFandomBadgeKey?: string | null;
  journeyProgressSummary?: string | null;
  collectionMasterySummary?: string | null;
  tradeReputationScoreSummary?: string | null;
  valueIdentitySummary?: string | null;
  rarityProfileLabel?: string | null;
  grailHighlightSummary?: string | null;
  fandomSummary?: string | null;
  clubs?: { clubId: string; displayName: string }[];
  primaryClubId?: string | null;
  sharedClubsSummary?: string | null;
  reputationSummary?: string | null;
  influenceSummary?: string | null;
  presence?: {
    optedOut: boolean;
    lastSeenAt: string | null;
    lastActivityAt: string | null;
    lastActivityKey: string | null;
  };
};

export const RecommendedCollectorsStrip = memo(function RecommendedCollectorsStrip({
  limit = 8,
}: {
  limit?: number;
}) {
  const [rows, setRows] = useState<CollectorRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/social/recommended-collectors?limit=${encodeURIComponent(String(limit))}`,
          { cache: "no-store" }
        );
        const body = (await res.json()) as { collectors?: CollectorRow[] };
        if (!cancelled && res.ok) setRows(body.collectors ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (loading) {
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <p className="text-mca-caption text-mca-ink-muted">Loading suggested collectors…</p>
      </Panel>
    );
  }

  if (rows.length === 0) {
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Recommended collectors
        </p>
        <p className="mt-mca-sm text-mca-caption text-mca-hint">
          As you set play style, fandom pins, and collection milestones, we surface trainers with overlapping
          public identity signals.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Recommended collectors
      </p>
      <ul className="mt-mca-md max-h-[min(420px,55vh)] touch-pan-y space-y-mca-sm overflow-y-auto overscroll-contain md:max-h-none md:overflow-visible">
        {rows.map((m) => (
          <li
            key={m.userId}
            className="flex items-center justify-between gap-mca-md rounded-mca-control border border-mca-border/70 bg-mca-surface-elevated/30 px-mca-sm py-mca-xs"
          >
            <Link
              href={`/profile/${encodeURIComponent(m.userId)}`}
              className="flex min-w-0 flex-1 items-center gap-mca-sm"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-mca-border bg-mca-surface">
                {m.avatarUrl ? (
                  <Image
                    src={m.avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized={m.avatarUrl.startsWith("data:")}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-mca-caption text-mca-ink-subtle">
                    —
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p
                  className="flex min-w-0 flex-wrap items-center gap-mca-xs"
                  title={
                    [m.traitsTooltip, buildInlineIdentityProgressTitle(
                      m.journeyProgressSummary,
                      m.collectionMasterySummary,
                      m.tradeReputationScoreSummary,
                      m.topTradeBadgeKey,
                      {
                        personaText: m.personaText,
                        valueSummary: m.valueIdentitySummary,
                        grailSummary: m.grailHighlightSummary,
                        valueBadgeKey: m.topValueBadgeKey,
                        rarityProfileLabel: m.rarityProfileLabel,
                        fandomSummary: m.fandomSummary,
                        clubsSummary:
                          m.clubs && m.clubs.length > 0
                            ? `Clubs: ${m.clubs.map((c) => c.displayName).join(", ")}`
                            : null,
                        reputationSummary: m.reputationSummary,
                        influenceSummary: m.influenceSummary,
                      }
                    )]
                      .filter(Boolean)
                      .join("\n\n") || undefined
                  }
                >
                  <InlineUserBadges
                    tierSlug={m.tierSlug}
                    milestoneKey={m.topScanMilestone}
                    journeyBadgeKey={m.topJourneyBadgeKey}
                    collectionMasteryBadgeKey={m.topCollectionMasteryBadgeKey}
                    tradeBadgeKey={m.topTradeBadgeKey}
                    tradeReputationSummary={m.tradeReputationScoreSummary}
                    playBadgeKey={m.topPlayBadgeKey}
                    valueBadgeKey={m.topValueBadgeKey}
                    valueIdentitySummary={m.valueIdentitySummary}
                    fandomBadgeKey={m.topFandomBadgeKey}
                    fandomSummary={m.fandomSummary}
                  />
                  <InlineUserFlair flairKey={m.topFlairKey} secondaryFlairKey={m.secondaryPlayFlairKey} />
                  <InlineSeasonalEvent
                    topSeasonalFlairKey={m.topSeasonalFlairKey}
                    topSeasonalBadgeKey={m.topSeasonalBadgeKey}
                  />
                  {m.presence ? (
                    <TrainerPresenceDot
                      lastSeenAt={m.presence.lastSeenAt}
                      lastActivityAt={m.presence.lastActivityAt}
                      lastActivityKey={m.presence.lastActivityKey}
                      presenceOptOut={m.presence.optedOut}
                      className="mt-0.5"
                    />
                  ) : null}
                  <span className="truncate text-mca-body font-medium text-mca-ink-strong">
                    {m.username?.trim() || "Trainer"}
                  </span>
                </p>
                {m.personaText?.trim() ? (
                  <p className="line-clamp-2 text-[11px] leading-snug text-mca-ink-subtle">{m.personaText.trim()}</p>
                ) : null}
                {m.reputationSummary?.trim() ? (
                  <p className="mt-mca-trace text-[11px] leading-snug text-mca-ink-body">{m.reputationSummary.trim()}</p>
                ) : null}
                {m.influenceSummary?.trim() ? (
                  <p className="mt-mca-trace text-[11px] leading-snug text-mca-accent-strong/90">{m.influenceSummary.trim()}</p>
                ) : null}
                {m.sharedClubsSummary?.trim() ? (
                  <p className="mt-mca-trace text-[11px] leading-snug text-mca-accent-strong/90">
                    {m.sharedClubsSummary.trim()}
                  </p>
                ) : null}
              </div>
            </Link>
            <span
              className="shrink-0 font-mono text-mca-caption text-mca-ink-subtle tabular-nums"
              title={m.traitsTooltip ?? undefined}
            >
              {m.similarityScore}
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
});
