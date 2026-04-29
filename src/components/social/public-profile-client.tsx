"use client";

import { ProfileReputationPanel } from "@/components/reputation/profile-reputation-panel";
import { ProfileInfluencePanel } from "@/components/influence/profile-influence-panel";
import { CollectorTimeline } from "@/components/activity/collector-timeline";
import { ProfileCollectorClubsPanel } from "@/components/clubs/profile-collector-clubs-panel";
import { ProfileSeasonSummaryPanel } from "@/components/seasons/profile-season-summary-panel";
import { MiniActivityStrip } from "@/components/activity/mini-activity-strip";
import { ProfileActivityHeatmap } from "@/components/activity/profile-activity-heatmap";
import { UserBadge } from "@/components/badges/user-badge";
import { UserBadgeList } from "@/components/badges/user-badge-list";
import { UserFlairList } from "@/components/flair/user-flair-list";
import { CollectionMasteryCard } from "@/components/collection/collection-mastery-card";
import { JourneyList } from "@/components/journeys/journey-list";
import { GlobalFeedClient } from "@/components/feed/global-feed-client";
import { ProfilePresenceLine } from "@/components/presence/profile-presence-line";
import { TrainerPresenceDot } from "@/components/presence/trainer-presence-dot";
import { ProfileSubjectPresence } from "@/components/social/profile-subject-presence";
import { TierEmblem } from "@/components/tier/tier-emblem";
import type { SocialProfilePayload } from "@/lib/social/types";
import { getFandomOptionById, type FandomValueKind } from "@/lib/fandom/fandom-catalog";
import { formatUsdApproxFromCents, rarityProfileFromCounts } from "@/lib/value/value-identity-helpers";
import { getArchetypeById } from "@/lib/play/archetype-catalog";
import { getFormatById } from "@/lib/play/formats-catalog";
import { positiveRatioFromCounts } from "@/lib/trade/trade-reputation-helpers";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { resolveAuthorName } from "@/lib/profile/resolveAuthor";
import { safeTrainerAccent } from "@/lib/profile/trainer-accent";
import {
  profileCardClass,
  profileStatsAccentClass,
  resolveTierAuraKey,
  tierProfileHeaderAccentClass,
} from "@/lib/tier/tier-emblem-meta";
import { cn } from "@/lib/ui/cn";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import Image from "next/image";
import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";

export type PublicProfileClientProps = {
  initial: SocialProfilePayload;
  viewerId: string | null;
};

export const PublicProfileClient = memo(function PublicProfileClient({
  initial,
  viewerId,
}: PublicProfileClientProps) {
  const [profile, setProfile] = useState<SocialProfilePayload>(initial);
  const [followLoading, setFollowLoading] = useState(false);
  const [following, setFollowing] = useState(() => initial.viewerFollowsTarget ?? false);

  const accent = safeTrainerAccent(profile.favoriteColor ?? undefined);

  useEffect(() => {
    setProfile(initial);
    setFollowing(initial.viewerFollowsTarget ?? false);
  }, [initial]);

  useEffect(() => {
    mcaLog.event(
      "social.profile.view",
      { userId: initial.userId, visibility: initial.visibility },
      { componentName: "PublicProfileClient", surfaceName: "social.profile" }
    );
  }, [initial.userId, initial.visibility]);

  const presenceTouchAt = useRef(0);
  useEffect(() => {
    if (!viewerId) return;
    const ping = () => {
      const now = Date.now();
      if (now - presenceTouchAt.current < 90_000) return;
      presenceTouchAt.current = now;
      void fetch("/api/social/presence/touch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity: "browsing_sets" }),
      });
    };
    ping();
    const id = window.setInterval(ping, 90_000);
    return () => window.clearInterval(id);
  }, [viewerId]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/social/profile/${encodeURIComponent(initial.userId)}`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const data = (await res.json()) as { profile?: SocialProfilePayload };
    if (data.profile) setProfile(data.profile);
  }, [initial.userId]);

  const onFollow = useCallback(async () => {
    if (!viewerId || viewerId === profile.userId) return;
    setFollowLoading(true);
    const nextFollow = !following;
    try {
      const res = await fetch(nextFollow ? "/api/social/follow" : "/api/social/unfollow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: profile.userId }),
      });
      if (res.ok) {
        setFollowing(nextFollow);
        await refresh();
      }
    } finally {
      setFollowLoading(false);
    }
  }, [viewerId, profile.userId, following, refresh]);

  const stats = profile.stats;
  const isSelf = viewerId === profile.userId;
  const displayName = profile.displayName?.trim() ?? "";
  const handle = profile.handle?.trim() ?? "";
  const headline = resolveAuthorName({
    display_name: profile.displayName ?? null,
    handle: profile.handle ?? null,
    username: profile.username ?? null,
  });
  const showSocialCounts =
    profile.visibility !== "stub" &&
    typeof profile.followerCount === "number" &&
    typeof profile.followingCount === "number";

  const websiteRaw = profile.website?.trim() ?? "";
  const websiteHref =
    websiteRaw && (websiteRaw.startsWith("http://") || websiteRaw.startsWith("https://"))
      ? websiteRaw
      : websiteRaw
        ? `https://${websiteRaw}`
        : "";

  const counts = profile.activityCounts;
  const joinedLabel =
    profile.visibility !== "stub" && profile.joinedAt
      ? new Date(profile.joinedAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : null;

  const tierSlugRaw = profile.tierSlug?.trim() ?? "";
  const showTierEmblem =
    profile.visibility !== "stub" && tierSlugRaw.length > 0;
  const tierAuraKey = showTierEmblem ? resolveTierAuraKey(tierSlugRaw) : null;

  return (
    <div
      className="space-y-mca-xl"
      style={
        {
          "--trainer-accent": accent,
        } as React.CSSProperties
      }
    >
      <section
        className={cn(
          profileCardClass(profile.tierSlug),
          "relative overflow-hidden rounded-mca-card border p-mca-lg",
          tierAuraKey ? tierProfileHeaderAccentClass(tierAuraKey) : null
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-24 opacity-40"
          style={{
            background: `linear-gradient(90deg, transparent, color-mix(in srgb, ${accent} 55%, transparent), transparent)`,
          }}
        />
        <div className="relative z-[1] flex flex-col gap-mca-lg lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-mca-md sm:flex-row sm:items-start">
            <div
              className="relative h-36 w-36 shrink-0 overflow-hidden rounded-full border-4 border-mca-surface bg-mca-surface shadow-[0_0_36px_var(--trainer-accent)] ring-4 ring-[color-mix(in_srgb,var(--trainer-accent)_35%,transparent)] ring-offset-2 ring-offset-mca-surface md:h-44 md:w-44"
              style={{ boxShadow: `0 0 42px color-mix(in srgb, ${accent} 55%, transparent)` }}
            >
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="176px"
                  unoptimized={profile.avatarUrl.startsWith("data:")}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-mca-chrome/40 text-3xl text-mca-ink-subtle">
                  ?
                </div>
              )}
            </div>
            <div className="min-w-0 text-center sm:text-left">
              <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                Trainer profile
              </p>
              <div className="mt-mca-sm flex flex-wrap items-center justify-center gap-mca-sm sm:justify-start">
                <h1 className="text-balance text-3xl font-bold tracking-tight text-mca-ink-strong md:text-4xl">
                  {headline}
                </h1>
                <ProfileSubjectPresence subjectUserId={profile.userId} presence={profile.presence ?? null} />
              </div>
              {displayName && handle ? (
                <p className="mt-mca-xs font-mono text-sm text-mca-ink-muted">@{handle}</p>
              ) : handle && !displayName ? (
                <p className="mt-mca-xs font-mono text-sm text-mca-ink-muted">@{handle}</p>
              ) : null}
              {profile.personaText?.trim() ? (
                <p className="mt-mca-sm max-w-2xl text-pretty text-sm leading-snug text-mca-ink-muted md:text-base">
                  {profile.personaText.trim()}
                </p>
              ) : null}
              {profile.visibility !== "stub" && profile.presence ? (
                <ProfilePresenceLine presence={profile.presence} />
              ) : null}
              {profile.visibility !== "stub" && profile.similarCollectors && profile.similarCollectors.length > 0 ? (
                <div className="mt-mca-md w-full max-w-2xl text-left">
                  <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                    Similar collectors
                  </p>
                  <ul className="mt-mca-sm grid gap-mca-sm sm:grid-cols-2 lg:grid-cols-3">
                    {profile.similarCollectors.map((s) => (
                      <li key={s.userId}>
                        <Link
                          href={`/profile/${encodeURIComponent(s.userId)}`}
                          className="flex items-center gap-mca-sm rounded-mca-control border border-mca-border/70 bg-mca-surface-elevated/25 p-mca-sm transition duration-200 ease-mca-standard hover:bg-mca-chrome/30"
                        >
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-mca-border bg-mca-surface">
                            {s.avatarUrl ? (
                              <Image
                                src={s.avatarUrl}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="44px"
                                unoptimized={s.avatarUrl.startsWith("data:")}
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-mca-caption text-mca-ink-subtle">
                                —
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="flex min-w-0 items-center gap-mca-xs">
                              {s.presence ? (
                                <TrainerPresenceDot
                                  lastSeenAt={s.presence.lastSeenAt}
                                  lastActivityAt={s.presence.lastActivityAt}
                                  lastActivityKey={s.presence.lastActivityKey}
                                  presenceOptOut={s.presence.optedOut}
                                />
                              ) : null}
                              <span className="truncate text-mca-body font-medium text-mca-ink-strong">
                                {resolveAuthorName({
                                  display_name: s.displayName,
                                  handle: s.handle,
                                  username: s.username,
                                })}
                              </span>
                            </p>
                            {s.personaText?.trim() ? (
                              <p className="line-clamp-2 text-[11px] leading-snug text-mca-ink-subtle">
                                {s.personaText.trim()}
                              </p>
                            ) : null}
                            <p className="text-mca-caption text-mca-ink-muted tabular-nums">
                              Similarity score {s.similarityScore}
                            </p>
                            {s.activityHeatmapStrip && s.activityHeatmapStrip.length > 0 ? (
                              <MiniActivityStrip counts={s.activityHeatmapStrip} className="mt-mca-xs" />
                            ) : null}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {joinedLabel && profile.visibility !== "stub" ? (
                <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">Joined {joinedLabel}</p>
              ) : null}
              <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">
                {stats.cardCount} cards · {stats.binderCount} binders · {stats.deckCount} decks ·{" "}
                {stats.tradeCount} trades
              </p>
              {showSocialCounts ? (
                <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">
                  {profile.followerCount} followers · {profile.followingCount} following
                </p>
              ) : null}
              {profile.visibility === "stub" && profile.stubReason ? (
                <p className="mt-mca-md text-mca-caption text-mca-hint">{profile.stubReason}</p>
              ) : null}
            </div>
          </div>
          {showTierEmblem ? (
            <div className="flex shrink-0 justify-center lg:justify-center lg:px-mca-sm">
              <TierEmblem tierSlug={tierSlugRaw} variant="profile" auraKey={tierAuraKey ?? undefined} />
            </div>
          ) : null}
          <div className="flex shrink-0 flex-wrap justify-center gap-mca-sm lg:justify-end">
            {!isSelf && viewerId ? (
              <Button
                type="button"
                variant={following ? "secondary" : "primary"}
                disabled={followLoading}
                className="text-mca-caption shadow-mca-panel"
                onClick={onFollow}
              >
                {following ? "Following" : "Follow"}
              </Button>
            ) : null}
            {isSelf ? (
              <Link
                href="/profile/edit"
                className="inline-flex items-center rounded-mca-control bg-mca-accent-strong/90 px-mca-md py-mca-xs text-mca-caption font-semibold text-white shadow-mca-panel transition hover:bg-mca-accent"
              >
                Edit profile
              </Link>
            ) : null}
            <Link
              href="/profile"
              className="inline-flex items-center rounded-mca-control border border-mca-border bg-mca-surface/80 px-mca-sm py-mca-xs text-mca-caption font-medium text-mca-ink-body shadow-mca-panel transition hover:bg-mca-surface-elevated"
            >
              My profile
            </Link>
          </div>
        </div>

        {profile.visibility !== "stub" && counts ? (
          <div
            className={cn(
              "relative z-[1] mt-mca-xl grid grid-cols-2 gap-0 overflow-hidden rounded-mca-control pt-mca-lg sm:grid-cols-4",
              profileStatsAccentClass(profile.tierSlug)
            )}
          >
            <StatChip label="Posts" value={counts.communityPosts} accent={accent} shell="profileStats" />
            <StatChip label="Scans" value={counts.scans} accent={accent} shell="profileStats" />
            <StatChip label="Trades" value={counts.trades} accent={accent} shell="profileStats" />
            <StatChip label="Achievements" value={counts.achievements} accent={accent} shell="profileStats" />
          </div>
        ) : null}

        {profile.visibility !== "stub" ? (
          <div className="relative z-[1] mt-mca-lg flex flex-wrap items-center gap-mca-sm border-t border-mca-border/40 pt-mca-lg">
            {profile.favoriteCard?.trim() ? (
              <span
                className="rounded-full px-mca-md py-mca-xs text-mca-caption font-medium shadow-inner"
                style={{
                  backgroundColor: `color-mix(in srgb, ${accent} 22%, transparent)`,
                  color: "var(--mca-ink-strong, inherit)",
                }}
              >
                Favorite card · {profile.favoriteCard.trim()}
              </span>
            ) : null}
            {profile.favoriteSet?.trim() ? (
              <span className="rounded-full border border-mca-border bg-mca-surface/80 px-mca-md py-mca-xs text-mca-caption font-medium shadow-mca-panel">
                Favorite set · {profile.favoriteSet.trim()}
              </span>
            ) : null}
            {profile.favoriteColor?.trim() ? (
              <span
                className="h-9 w-9 shrink-0 rounded-full border-2 border-mca-surface shadow-mca-panel ring-2 ring-[color-mix(in_srgb,var(--trainer-accent)_50%,transparent)] sm:h-10 sm:w-10"
                style={{
                  backgroundColor: accent,
                  boxShadow: `0 0 20px color-mix(in srgb, ${accent} 45%, transparent)`,
                }}
                aria-label="Trainer accent"
              />
            ) : null}
          </div>
        ) : null}
      </section>

      {profile.visibility !== "stub" ? (
        <>
          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
            <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Badges</h2>
            <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
              Tier, membership, and scan milestones — shown in a compact form on community posts and the
              activity feed.
            </p>
            {(profile.badges ?? []).some((b) => b.badge_type === "seasonal_event") ? (
              <h3 className="mt-mca-md text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                Seasonal events
              </h3>
            ) : null}
            <div className="mt-mca-md">
              <UserBadgeList badges={profile.badges} />
            </div>
          </Panel>

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
            <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Flair</h2>
            <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
              Reputation, streaks, and shop signals — a compact icon also appears next to your badges on
              feeds and community posts.
            </p>
            <p className="mt-mca-sm text-mca-caption text-mca-ink-subtle">
              {(profile.activityStreak ?? 0) > 0
                ? `${profile.activityStreak}-day UTC activity streak · flair unlocks from community mix`
                : "Activity streak flairs unlock after a few consecutive UTC days with scans, posts, or likes."}
            </p>
            <div className="mt-mca-md">
              <UserFlairList flairKeys={profile.earnedFlairKeys} />
            </div>
          </Panel>

          {profile.reputation ? <ProfileReputationPanel block={profile.reputation} /> : null}
          {profile.influence ? <ProfileInfluencePanel block={profile.influence} /> : null}

          {profile.activityHeatmap && profile.activityHeatmap.counts.length > 0 ? (
            <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
              <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Activity heatmap</h2>
              <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
                A year-long view of scans, deck and binder work, milestones, streaks, seasons, and collection
                sync — aggregated server-side (UTC calendar days).
              </p>
              <div className="mt-mca-md overflow-x-auto">
                <ProfileActivityHeatmap
                  year={profile.activityHeatmap.year}
                  counts={profile.activityHeatmap.counts}
                  className="min-w-[260px]"
                />
              </div>
            </Panel>
          ) : null}

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
            <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Collector timeline</h2>
            <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
              First-time milestones from your collecting journey — dates only; expand for safe metadata keys.
            </p>
            <div className="mt-mca-md">
              <CollectorTimeline events={profile.timelineEvents ?? []} />
            </div>
          </Panel>

          {profile.lastSeasonSummary ? (
            <ProfileSeasonSummaryPanel
              block={profile.lastSeasonSummary}
              profileUserId={profile.userId}
              isSelf={isSelf}
              yearInReviewYear={
                profile.lastYearInReview?.year ?? new Date().getUTCFullYear() - 1
              }
            />
          ) : null}

          {(profile.clubs?.length ?? 0) > 0 ? (
            <ProfileCollectorClubsPanel
              clubs={profile.clubs ?? []}
              primaryClubId={profile.primaryClubId}
            />
          ) : null}

          {(profile.journeys?.length ?? 0) > 0 ? (
            <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
              <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Collector journeys</h2>
              <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
                Long-term goals across scanning, collection, streaks, seasons, and reputation — progress syncs
                from your activity.
              </p>
              <div className="mt-mca-md">
                <JourneyList
                  active={profile.activeJourneys ?? []}
                  completed={profile.completedJourneys ?? []}
                />
              </div>
            </Panel>
          ) : null}

          {(profile.collectionMastery?.length ?? 0) > 0 ? (
            <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
              <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Collection mastery</h2>
              <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
                Fully-filled binders and master catalog sets — tracked server-side when you move cards on
                your grids.
              </p>
              <div className="mt-mca-md space-y-mca-lg">
                <div>
                  <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                    Binder mastery
                  </h3>
                  <ul className="mt-mca-sm space-y-mca-sm">
                    {(profile.collectionMastery ?? [])
                      .filter((r) => r.masteryType === "binder")
                      .map((row) => (
                        <li key={row.masteryKey}>
                          <CollectionMasteryCard row={row} />
                        </li>
                      ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                    Set completion
                  </h3>
                  <ul className="mt-mca-sm space-y-mca-sm">
                    {(profile.collectionMastery ?? [])
                      .filter((r) => r.masteryType === "set")
                      .map((row) => (
                        <li key={row.masteryKey}>
                          <CollectionMasteryCard row={row} />
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </Panel>
          ) : null}

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
            <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Trading reputation</h2>
            <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
              Aggregated peer trade feedback only — detailed reviews stay private until a full marketplace
              trade flow ships.
            </p>
            {(() => {
              const tr = profile.tradeReputation;
              const completed = tr?.completedTradesCount ?? 0;
              const pos = tr?.positiveFeedbackCount ?? 0;
              const neu = tr?.neutralFeedbackCount ?? 0;
              const neg = tr?.negativeFeedbackCount ?? 0;
              const ratioPct =
                completed > 0 ? Math.round(positiveRatioFromCounts(tr ?? undefined) * 100) : null;
              const tradeBadges = (profile.badges ?? []).filter((b) => b.badge_type === "trade_reputation");
              return (
                <div className="mt-mca-md space-y-mca-md">
                  <dl className="grid grid-cols-2 gap-mca-sm text-mca-caption sm:grid-cols-3">
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
                      <dt className="text-mca-ink-subtle">Completed trades</dt>
                      <dd className="mt-mca-trace text-lg font-semibold tabular-nums text-mca-ink-strong">
                        {completed}
                      </dd>
                    </div>
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
                      <dt className="text-mca-ink-subtle">Positive</dt>
                      <dd className="mt-mca-trace font-semibold tabular-nums text-mca-ink-strong">{pos}</dd>
                    </div>
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
                      <dt className="text-mca-ink-subtle">Neutral</dt>
                      <dd className="mt-mca-trace font-semibold tabular-nums text-mca-ink-strong">{neu}</dd>
                    </div>
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
                      <dt className="text-mca-ink-subtle">Negative</dt>
                      <dd className="mt-mca-trace font-semibold tabular-nums text-mca-ink-strong">{neg}</dd>
                    </div>
                    <div className="col-span-2 rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm sm:col-span-3">
                      <dt className="text-mca-ink-subtle">Last trade</dt>
                      <dd className="mt-mca-trace text-mca-body text-mca-ink-body">
                        {tr?.lastTradeAt
                          ? new Date(tr.lastTradeAt).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  {ratioPct != null ? (
                    <p className="text-mca-caption text-mca-ink-muted">
                      Positive ratio: <span className="font-semibold tabular-nums">{ratioPct}%</span>
                    </p>
                  ) : null}
                  {tradeBadges.length > 0 ? (
                    <div>
                      <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                        Trade badges
                      </h3>
                      <ul className="mt-mca-sm flex flex-wrap gap-mca-sm">
                        {tradeBadges.map((row) => (
                          <li key={`${row.badge_type}-${row.badge_key}`}>
                            <UserBadge row={row} variant="full" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </Panel>

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
            <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Play identity</h2>
            <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
              Favorite format, archetype, and deck label — synced from your saved play preferences. Deck stats
              power badges when you maintain multiple lists.
            </p>
            {(() => {
              const pi = profile.playIdentity;
              const fmt = getFormatById(pi?.favoriteFormatId ?? null);
              const arch = getArchetypeById(pi?.favoriteArchetypeId ?? null);
              const playBadges = (profile.badges ?? []).filter((b) => b.badge_type === "play_identity");
              const decks = profile.playTopDecks ?? [];
              return (
                <div className="mt-mca-md space-y-mca-md">
                  <dl className="grid gap-mca-sm text-mca-caption sm:grid-cols-2">
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
                      <dt className="text-mca-ink-subtle">Favorite format</dt>
                      <dd className="mt-mca-trace flex items-center gap-mca-xs text-mca-body text-mca-ink-strong">
                        {fmt ? (
                          <>
                            <span className="text-lg leading-none" aria-hidden>
                              {fmt.icon}
                            </span>
                            <span>{fmt.displayName}</span>
                          </>
                        ) : (
                          <span className="text-mca-ink-muted">—</span>
                        )}
                      </dd>
                    </div>
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
                      <dt className="text-mca-ink-subtle">Favorite archetype</dt>
                      <dd className="mt-mca-trace flex items-center gap-mca-xs text-mca-body text-mca-ink-strong">
                        {arch ? (
                          <>
                            <span className="text-lg leading-none" aria-hidden>
                              {arch.icon}
                            </span>
                            <span>{arch.displayName}</span>
                          </>
                        ) : (
                          <span className="text-mca-ink-muted">—</span>
                        )}
                      </dd>
                    </div>
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm sm:col-span-2">
                      <dt className="text-mca-ink-subtle">Favorite deck</dt>
                      <dd className="mt-mca-trace text-mca-body text-mca-ink-body">
                        {pi?.favoriteDeckName?.trim() ? pi.favoriteDeckName.trim() : "—"}
                      </dd>
                    </div>
                  </dl>
                  {decks.length > 0 ? (
                    <div>
                      <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                        Top decks by size
                      </h3>
                      <ul className="mt-mca-sm space-y-mca-xs text-mca-caption text-mca-ink-muted">
                        {decks.slice(0, 5).map((d) => (
                          <li key={d.deckId} className="tabular-nums">
                            <span className="font-medium text-mca-ink-body">{d.deckName}</span>
                            {" · "}
                            {d.totalCards} cards ({d.uniqueCards} unique)
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {playBadges.length > 0 ? (
                    <div>
                      <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                        Play badges
                      </h3>
                      <ul className="mt-mca-sm flex flex-wrap gap-mca-sm">
                        {playBadges.map((row) => (
                          <li key={`${row.badge_type}-${row.badge_key}`}>
                            <UserBadge row={row} variant="full" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </Panel>

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
            <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Collection value &amp; grails</h2>
            <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
              Estimates use cached quotes and rarity metadata — illustrative only; not appraisals or financial advice.
            </p>
            {(() => {
              const cv = profile.collectionValue;
              const valueBadges =
                profile.badges?.filter((b) => b.badge_type === "collection_value") ?? [];
              const grails = profile.grailCards ?? [];
              const mix = rarityProfileFromCounts(cv ?? null);
              const showValue = cv && (cv.totalCards ?? 0) > 0;
              return (
                <div className="mt-mca-md space-y-mca-md">
                  <dl className="grid gap-mca-sm text-mca-caption sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm sm:col-span-2">
                      <dt className="text-mca-ink-subtle">Estimated value (approx.)</dt>
                      <dd className="mt-mca-trace text-lg font-semibold tabular-nums text-mca-ink-strong">
                        {showValue ? formatUsdApproxFromCents(cv.estimatedValueCents) : "—"}
                      </dd>
                    </div>
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
                      <dt className="text-mca-ink-subtle">Total cards</dt>
                      <dd className="mt-mca-trace font-semibold tabular-nums text-mca-ink-strong">
                        {cv?.totalCards ?? 0}
                      </dd>
                    </div>
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
                      <dt className="text-mca-ink-subtle">Distinct catalog IDs</dt>
                      <dd className="mt-mca-trace font-semibold tabular-nums text-mca-ink-strong">
                        {cv?.uniqueCards ?? 0}
                      </dd>
                    </div>
                    <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
                      <dt className="text-mca-ink-subtle">Premium / rare tiers</dt>
                      <dd className="mt-mca-trace font-semibold tabular-nums text-mca-ink-strong">
                        {cv?.highRarityCount ?? 0}
                      </dd>
                    </div>
                  </dl>
                  {mix ? (
                    <p className="text-mca-caption text-mca-ink-body">
                      <span className="font-semibold text-mca-ink-strong">Mix:</span> {mix}
                    </p>
                  ) : null}
                  {valueBadges.length > 0 ? (
                    <div>
                      <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                        Collection badges
                      </h3>
                      <ul className="mt-mca-sm flex flex-wrap gap-mca-sm">
                        {valueBadges.map((row) => (
                          <li key={`${row.badge_type}-${row.badge_key}`}>
                            <UserBadge row={row} variant="full" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {grails.length > 0 ? (
                    <div>
                      <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                        Grail cards
                      </h3>
                      <ul className="mt-mca-sm space-y-mca-xs">
                        {grails.map((g) => (
                          <li
                            key={g.cardId}
                            className="rounded-mca-control border border-mca-border/50 bg-mca-surface/35 px-mca-sm py-mca-xs text-mca-caption text-mca-ink-body"
                          >
                            <span className="font-medium text-mca-ink-strong">{g.cardName}</span>
                            {g.note?.trim() ? (
                              <span className="block text-mca-ink-muted">{g.note.trim()}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </Panel>

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
            <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">Fandom identity</h2>
            <p className="mt-mca-xs max-w-2xl text-sm text-mca-ink-muted">
              Curated taste pins — set, era, artist, motif, and foil style. Shown on social rows as flair and
              badges when you save them.
            </p>
            {(() => {
              const fi = profile.fandomIdentity;
              const fandomBadges = profile.badges?.filter((b) => b.badge_type === "fandom") ?? [];
              const row = (label: string, kind: FandomValueKind, id: string | null | undefined) => {
                const opt = id ? getFandomOptionById(kind, id) : null;
                return (
                  <div className="rounded-mca-control border border-mca-border/60 bg-mca-surface/40 p-mca-sm">
                    <dt className="text-mca-ink-subtle">{label}</dt>
                    <dd className="mt-mca-trace flex items-center gap-mca-xs text-mca-body text-mca-ink-strong">
                      {opt ? (
                        <>
                          <span className="text-lg leading-none" aria-hidden>
                            {opt.icon}
                          </span>
                          <span>{opt.displayName}</span>
                        </>
                      ) : (
                        <span className="text-mca-ink-muted">—</span>
                      )}
                    </dd>
                  </div>
                );
              };
              const sug = profile.fandomSuggestions;
              const hasRenderableSuggestion =
                !!sug &&
                Boolean(
                  (sug.suggestedSetId && getFandomOptionById("set", sug.suggestedSetId)) ||
                    (sug.suggestedEraId && getFandomOptionById("era", sug.suggestedEraId)) ||
                    (sug.suggestedArtistId && getFandomOptionById("artist", sug.suggestedArtistId)) ||
                    (sug.suggestedCharacterId && getFandomOptionById("character", sug.suggestedCharacterId)) ||
                    (sug.suggestedThemeId && getFandomOptionById("theme", sug.suggestedThemeId))
                );
              const sugRow = (label: string, kind: FandomValueKind, id: string | null | undefined) => {
                const opt = id ? getFandomOptionById(kind, id) : null;
                if (!opt) return null;
                return (
                  <li className="flex items-center gap-mca-xs text-mca-caption text-mca-ink-body">
                    <span aria-hidden>{opt.icon}</span>
                    <span className="text-mca-ink-subtle">{label}:</span>
                    <span>{opt.displayName}</span>
                  </li>
                );
              };
              return (
                <div className="mt-mca-md space-y-mca-md">
                  <dl className="grid gap-mca-sm text-mca-caption sm:grid-cols-2">
                    {row("Favorite set", "set", fi?.favoriteSetId)}
                    {row("Favorite era", "era", fi?.favoriteEraId)}
                    {row("Favorite artist", "artist", fi?.favoriteArtistId)}
                    {row("Favorite character / motif", "character", fi?.favoriteCharacterId)}
                    {row("Favorite foil / theme", "theme", fi?.favoriteThemeId)}
                  </dl>
                  {fandomBadges.length > 0 ? (
                    <div>
                      <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
                        Fandom badges
                      </h3>
                      <ul className="mt-mca-sm flex flex-wrap gap-mca-sm">
                        {fandomBadges.map((b) => (
                          <li key={`${b.badge_type}-${b.badge_key}`}>
                            <UserBadge row={b} variant="full" />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {hasRenderableSuggestion && sug ? (
                    <div className="rounded-mca-control border border-dashed border-mca-border/70 bg-mca-surface/30 p-mca-md">
                      <h3 className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-muted">
                        Suggested fandoms (from collection)
                      </h3>
                      <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
                        Based on cards you own most — informational suggestions; saving fandom pins is
                        server-only and awards badges once.
                      </p>
                      <ul className="mt-mca-sm space-y-mca-xs">
                        {sugRow("Most-owned set", "set", sug.suggestedSetId)}
                        {sugRow("Most-owned era", "era", sug.suggestedEraId)}
                        {sugRow("Most-owned artist", "artist", sug.suggestedArtistId)}
                        {sugRow("Most-owned motif", "character", sug.suggestedCharacterId)}
                        {sugRow("Theme lean", "theme", sug.suggestedThemeId)}
                      </ul>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </Panel>

          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-card">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
            <h2 className="mt-mca-md text-xl font-semibold text-mca-ink-strong">About</h2>
            {profile.location?.trim() ? (
              <p className="mt-mca-sm text-mca-body text-mca-ink-muted">{profile.location.trim()}</p>
            ) : null}
            {websiteHref ? (
              <p className="mt-mca-sm">
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:text-mca-accent hover:underline"
                >
                  {websiteRaw}
                </a>
              </p>
            ) : null}
            {profile.bio?.trim() ? (
              <p className="mt-mca-md whitespace-pre-wrap text-mca-body leading-relaxed text-mca-ink-body">
                {profile.bio}
              </p>
            ) : (
              <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">No bio yet.</p>
            )}
            {(profile.favoriteSets?.length ?? 0) > 0 ? (
              <p className="mt-mca-md text-mca-caption text-mca-ink-muted">
                Favorite catalog sets: {profile.favoriteSets?.join(", ")}
              </p>
            ) : null}
          </Panel>

          <Panel className="rounded-mca-card border border-dashed border-mca-border/80 bg-mca-surface/30 p-mca-md shadow-mca-panel">
            <div className="flex flex-wrap items-center justify-between gap-mca-sm">
              <h2 className="text-xl font-semibold text-mca-ink-strong">Achievements</h2>
              <span className="rounded-full bg-mca-chrome px-mca-sm py-mca-trace text-mca-caption text-mca-ink-muted">
                Coming soon
              </span>
            </div>
            <div className="mt-mca-md grid grid-cols-2 gap-mca-sm sm:grid-cols-4">
              {["Explorer", "Collector", "Trader", "Community"].map((label) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-mca-control border border-mca-border/70 bg-mca-surface/60 p-mca-md text-center shadow-inner"
                >
                  <span className="text-2xl" aria-hidden>
                    ★
                  </span>
                  <span className="mt-mca-xs text-mca-caption font-medium text-mca-ink-muted">{label}</span>
                </div>
              ))}
            </div>
          </Panel>

          <section className="space-y-mca-md">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-mca-border to-transparent" />
            <h2 className="text-xl font-semibold text-mca-ink-strong">Trainer activity</h2>
            <p className="text-mca-caption text-mca-ink-muted">
              Recent actions from the global feed for this trainer.
            </p>
            <GlobalFeedClient
              feedUrl={`/api/profile/${encodeURIComponent(profile.userId)}/feed?limit=20`}
              variant="profile"
              disableOfflineCache
            />
          </section>
        </>
      ) : null}
    </div>
  );
});

function StatChip({
  label,
  value,
  accent,
  shell = "default",
}: {
  label: string;
  value: number;
  accent: string;
  shell?: "default" | "profileStats";
}) {
  const profileStats = shell === "profileStats";
  return (
    <div
      className={cn(
        "rounded-mca-control border p-mca-md text-center",
        profileStats
          ? "mca-profile-stat-chip border bg-mca-surface/70"
          : "border-mca-border/60 bg-mca-surface/70 shadow-mca-panel"
      )}
      style={
        profileStats
          ? undefined
          : { boxShadow: `0 8px 24px color-mix(in srgb, ${accent} 12%, transparent)` }
      }
    >
      {profileStats ? <span className="mca-profile-stat-icon-dot" aria-hidden /> : null}
      <p className="text-2xl font-bold tabular-nums text-mca-ink-strong">{value}</p>
      <p className="text-mca-caption font-medium uppercase tracking-wide text-mca-ink-muted">{label}</p>
      {profileStats ? <div className="mca-profile-stat-meter" aria-hidden /> : null}
    </div>
  );
}
