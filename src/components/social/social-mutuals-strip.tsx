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

type Mutual = {
  userId: string;
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

export const SocialMutualsStrip = memo(function SocialMutualsStrip() {
  const [mutuals, setMutuals] = useState<Mutual[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadMutuals = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await fetchJson<{ mutuals: Mutual[] }>("/api/social/mutuals", { cache: "no-store" });
      if (r.kind !== "ok") {
        setLoadError(fetchJsonErrorMessage(r));
        setMutuals([]);
        return;
      }
      setMutuals(Array.isArray(r.data.mutuals) ? r.data.mutuals : []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load mutual trainers.");
      setMutuals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMutuals();
  }, [loadMutuals]);

  const scheduleSocialReload = useDebouncedSurfaceReload(loadMutuals, 180);

  useEffect(() => {
    const onRefresh = () => scheduleSocialReload();
    window.addEventListener(SOCIAL_SURFACES_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(SOCIAL_SURFACES_REFRESH_EVENT, onRefresh);
  }, [scheduleSocialReload]);

  if (loading) {
    return (
      <section aria-label="Mutual trainers" aria-live="polite" aria-busy="true">
        <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
          <p className="text-mca-caption text-mca-ink-muted" role="status">
            Loading mutual trainers…
          </p>
        </Panel>
      </section>
    );
  }

  if (loadError) {
    return (
      <section aria-label="Mutual trainers" aria-live="assertive">
        <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
          <InlineError>{loadError}</InlineError>
          <Button type="button" variant="secondary" className="mt-mca-sm text-xs" onClick={() => void loadMutuals()}>
            Try again
          </Button>
        </Panel>
      </section>
    );
  }

  if (mutuals.length === 0) {
    return (
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Mutual follows
        </p>
        <p className="mt-mca-sm text-mca-caption text-mca-hint">
          When you and another trainer follow each other, they show up here.
        </p>
      </Panel>
    );
  }

  return (
    <section aria-label="Mutual trainers" aria-live="polite">
      <Panel className="border-mca-border bg-mca-surface/35 p-mca-md">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Mutual follows
      </p>
      <ul className="mt-mca-md flex flex-wrap gap-mca-md">
        {mutuals.map((m) => (
          <li key={m.userId}>
            <Link
              href={`/profile/${encodeURIComponent(m.userId)}`}
              className="flex items-center gap-mca-sm rounded-mca-control border border-mca-border/70 bg-mca-surface-elevated/40 px-mca-sm py-mca-xs transition duration-200 ease-mca-standard hover:border-mca-accent-strong/35"
            >
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-mca-border bg-mca-surface">
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
              <span
                className="flex min-w-0 max-w-[12rem] items-center gap-mca-xs"
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
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-mca-caption font-medium text-mca-ink-body">
                    {m.username?.trim() || "Trainer"}
                  </span>
                  {m.personaText?.trim() ? (
                    <span className="line-clamp-2 text-[11px] leading-snug text-mca-ink-subtle">
                      {m.personaText.trim()}
                    </span>
                  ) : null}
                  {m.reputationSummary?.trim() ? (
                    <span className="mt-mca-trace block text-[11px] leading-snug text-mca-ink-body">
                      {m.reputationSummary.trim()}
                    </span>
                  ) : null}
                  {m.influenceSummary?.trim() ? (
                    <span className="mt-mca-trace block text-[11px] leading-snug text-mca-accent-strong/90">
                      {m.influenceSummary.trim()}
                    </span>
                  ) : null}
                  {m.badgeHighlight?.trim() ? (
                    <span className="mt-mca-trace block text-[11px] leading-snug text-mca-warn/95">{m.badgeHighlight.trim()}</span>
                  ) : null}
                  {m.presenceLabel?.trim() ? (
                    <span className="mt-mca-trace block text-[11px] leading-snug text-mca-ink-subtle">{m.presenceLabel.trim()}</span>
                  ) : null}
                  {m.activityHeatmapStrip && m.activityHeatmapStrip.length > 0 ? (
                    <MiniActivityStrip counts={m.activityHeatmapStrip} className="mt-mca-xs" />
                  ) : null}
                  {m.sharedClubsSummary?.trim() ? (
                    <span className="mt-mca-xs block text-[11px] leading-snug text-mca-accent-strong/90">
                      {m.sharedClubsSummary.trim()}
                    </span>
                  ) : null}
                  {m.seasonHighlight?.trim() ? (
                    <span className="mt-mca-xs block text-[11px] leading-snug text-mca-ink-subtle">
                      {m.seasonHighlight.trim()}
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
    </section>
  );
});
