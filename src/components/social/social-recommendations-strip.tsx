"use client";

import { InlineUserBadges } from "@/components/badges/inline-user-badges";
import { InlineUserFlair } from "@/components/flair/inline-user-flair";
import { TrainerPresenceDot } from "@/components/presence/trainer-presence-dot";
import { MiniActivityStrip } from "@/components/activity/mini-activity-strip";
import { InlineSeasonalEvent } from "@/components/seasonal/inline-seasonal-event";
import { buildInlineIdentityProgressTitle } from "@/lib/social/inline-identity-tooltip";
import { fetchJson, fetchJsonErrorMessage, useDebouncedSurfaceReload } from "@/lib/client";
import { SOCIAL_SURFACES_REFRESH_EVENT } from "@/lib/social/social-surfaces-refresh";
import { Button } from "@/mca-ui/button";
import { InlineError } from "@/mca-ui/inline-error";
import { Panel } from "@/mca-ui/panel";
import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useState } from "react";

type Rec = {
  userId: string;
  score: number;
  reasons: string[];
  username: string | null;
  avatarUrl: string | null;
  tierSlug?: string | null;
  topScanMilestone?: string | null;
  reputationScore?: number;
  activityStreak?: number;
  topFlairKey?: string | null;
  topSeasonalFlairKey?: string | null;
  topSeasonalBadgeKey?: string | null;
  seasonalBadgeKeys?: string[];
  topJourneyBadgeKey?: string | null;
  journeyProgressSummary?: string | null;
  topCollectionMasteryBadgeKey?: string | null;
  collectionMasterySummary?: string | null;
  tradeReputationScoreSummary?: string | null;
  topTradeBadgeKey?: string | null;
  favoriteFormatId?: string | null;
  favoriteArchetypeId?: string | null;
  favoriteDeckName?: string | null;
  topPlayBadgeKey?: string | null;
  secondaryPlayFlairKey?: string | null;
  valueIdentitySummary?: string | null;
  rarityProfileLabel?: string | null;
  topValueBadgeKey?: string | null;
  grailHighlightSummary?: string | null;
  topFandomBadgeKey?: string | null;
  fandomSummary?: string | null;
  personaText?: string | null;
  personaV2Label?: string | null;
  personaV2Summary?: string | null;
  identityHeadline?: string | null;
  identitySummary?: string | null;
  activityHeatmapStrip?: number[];
  seasonHighlight?: string | null;
  clubs?: { clubId: string; displayName: string }[];
  primaryClubId?: string | null;
  sharedClubsSummary?: string | null;
  reputationSummary?: string | null;
  influenceSummary?: string | null;
  badgeHighlight?: string | null;
  presenceLabel?: string | null;
  presence?: {
    optedOut: boolean;
    lastSeenAt: string | null;
    lastActivityAt: string | null;
    lastActivityKey: string | null;
  };
};

export const SocialRecommendationsStrip = memo(function SocialRecommendationsStrip() {
  const [rows, setRows] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRecs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetchJson<{ recommendations: Rec[] }>("/api/social/recommendations?limit=8", {
        cache: "no-store",
      });
      if (r.kind !== "ok") {
        setLoadError(fetchJsonErrorMessage(r));
        setRows([]);
        return;
      }
      setRows(Array.isArray(r.data.recommendations) ? r.data.recommendations : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load recommendations.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecs();
  }, [loadRecs]);

  const scheduleSocialReload = useDebouncedSurfaceReload(loadRecs, 180);

  useEffect(() => {
    const onRefresh = () => scheduleSocialReload();
    window.addEventListener(SOCIAL_SURFACES_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(SOCIAL_SURFACES_REFRESH_EVENT, onRefresh);
  }, [scheduleSocialReload]);

  if (loading) {
    return (
      <section aria-label="Recommended trainers" aria-live="polite" aria-busy="true">
        <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
          <p className="text-mca-caption text-mca-ink-muted" role="status">
            Loading recommendations…
          </p>
        </Panel>
      </section>
    );
  }

  if (loadError) {
    return (
      <section aria-label="Recommended trainers" aria-live="assertive">
        <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
          <InlineError>{loadError}</InlineError>
          <Button type="button" variant="secondary" className="mt-mca-sm text-xs" onClick={() => void loadRecs()}>
            Try again
          </Button>
        </Panel>
      </section>
    );
  }

  if (rows.length === 0) {
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Recommended trainers
        </p>
        <p className="mt-mca-sm text-mca-caption text-mca-hint">
          Add favorite sets to your profile and build your want/have lists — we’ll suggest collectors with
          overlapping interests and trade potential.
        </p>
      </Panel>
    );
  }

  const reasonLabel = (r: string) => {
    switch (r) {
      case "shared_interests":
        return "Shared interests";
      case "they_have_what_you_want":
        return "Has cards you want";
      case "you_have_what_they_want":
        return "Wants cards you have";
      default:
        return r;
    }
  };

  return (
    <section aria-label="Recommended trainers" aria-live="polite">
    <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Recommended trainers
      </p>
      <ul className="mt-mca-md space-y-mca-sm">
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
                  className="flex min-w-0 items-center gap-mca-xs"
                  title={buildInlineIdentityProgressTitle(
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
                      seasonHighlight: m.seasonHighlight,
                      clubsSummary:
                        m.clubs && m.clubs.length > 0
                          ? `Clubs: ${m.clubs.map((c) => c.displayName).join(", ")}`
                          : null,
                      reputationSummary: m.reputationSummary,
                      influenceSummary: m.influenceSummary,
                      badgeHighlight: m.badgeHighlight,
                      presenceLabel: m.presenceLabel,
                      personaV2Summary: m.personaV2Summary,
                      identityMapSummary: m.identitySummary,
                    }
                  )}
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
                  <InlineUserFlair
                    flairKey={m.topFlairKey}
                    secondaryFlairKey={m.secondaryPlayFlairKey}
                  />
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
                      className="mt-mca-trace"
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
                {m.badgeHighlight?.trim() ? (
                  <p className="mt-mca-trace text-[11px] leading-snug text-mca-warn/95">{m.badgeHighlight.trim()}</p>
                ) : null}
                {m.presenceLabel?.trim() ? (
                  <p className="mt-mca-trace text-[11px] leading-snug text-mca-ink-subtle">{m.presenceLabel.trim()}</p>
                ) : null}
                {m.activityHeatmapStrip && m.activityHeatmapStrip.length > 0 ? (
                  <MiniActivityStrip counts={m.activityHeatmapStrip} className="mt-mca-xs" />
                ) : null}
                {m.sharedClubsSummary?.trim() ? (
                  <p className="mt-mca-trace text-[11px] leading-snug text-mca-accent-strong/90">
                    {m.sharedClubsSummary.trim()}
                  </p>
                ) : null}
                {m.seasonHighlight?.trim() ? (
                  <p className="mt-mca-xs text-[11px] leading-snug text-mca-ink-subtle">{m.seasonHighlight.trim()}</p>
                ) : null}
                <p className="text-mca-caption text-mca-ink-muted">
                  {m.reasons.map(reasonLabel).join(" · ")}
                </p>
              </div>
            </Link>
            <span className="shrink-0 font-mono text-mca-caption text-mca-ink-subtle">{m.score} pts</span>
          </li>
        ))}
      </ul>
    </Panel>
    </section>
  );
});
