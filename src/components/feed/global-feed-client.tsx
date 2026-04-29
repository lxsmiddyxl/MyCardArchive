"use client";

import { InlineUserBadges } from "@/components/badges/inline-user-badges";
import { InlineUserFlair } from "@/components/flair/inline-user-flair";
import { InlineSeasonalEvent } from "@/components/seasonal/inline-seasonal-event";
import { TrainerPresenceDot } from "@/components/presence/trainer-presence-dot";
import { buildInlineIdentityProgressTitle } from "@/lib/social/inline-identity-tooltip";
import type { SocialPresenceSnapshot } from "@/lib/social/types";
import { LKG_KEY, lkgGet, lkgSet } from "@/lib/offline/surface-lkg";
import { Panel } from "@/mca-ui/panel";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useCallback, useEffect, useState } from "react";

type FeedItem = {
  id: string;
  kind: string;
  actor_id: string;
  actor_name?: string;
  actor_tier_slug?: string | null;
  actor_top_scan_milestone?: string | null;
  actor_reputation_score?: number;
  actor_reputation_summary?: string | null;
  actor_influence_summary?: string | null;
  actor_activity_streak?: number;
  actor_top_flair_key?: string | null;
  actor_top_seasonal_flair_key?: string | null;
  actor_top_seasonal_badge_key?: string | null;
  actor_seasonal_badge_keys?: string[];
  actor_top_journey_badge_key?: string | null;
  actor_journey_progress_summary?: string | null;
  actor_top_collection_mastery_badge_key?: string | null;
  actor_collection_mastery_summary?: string | null;
  actor_trade_reputation_score_summary?: string | null;
  actor_top_trade_badge_key?: string | null;
  actor_favorite_format_id?: string | null;
  actor_favorite_archetype_id?: string | null;
  actor_favorite_deck_name?: string | null;
  actor_top_play_badge_key?: string | null;
  actor_secondary_play_flair_key?: string | null;
  actor_value_identity_summary?: string | null;
  actor_rarity_profile_label?: string | null;
  actor_top_value_badge_key?: string | null;
  actor_grail_highlight_summary?: string | null;
  actor_top_fandom_badge_key?: string | null;
  actor_fandom_summary?: string | null;
  actor_persona_text?: string | null;
  /** Rolling activity log count (~7d UTC) for tooltip hints. */
  actor_week_activity_count?: number;
  actor_season_highlight?: string | null;
  /** Tooltip-only clubs line (display names). */
  actor_clubs_summary?: string | null;
  actor_presence?: SocialPresenceSnapshot;
  subject_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  rank_score?: number;
  signals?: Record<string, number>;
  ranking?: Record<string, unknown>;
};

export type GlobalFeedClientProps = {
  /** Override feed source (default: global ranked feed). */
  feedUrl?: string;
  /** `profile` hides ranking debug rows. */
  variant?: "global" | "profile";
  /** Skip offline last-known-good restore (e.g. embedded profile activity). */
  disableOfflineCache?: boolean;
};

export function GlobalFeedClient({
  feedUrl = "/api/feed?limit=30",
  variant = "global",
  disableOfflineCache = false,
}: GlobalFeedClientProps = {}) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFromCache(false);
    try {
      const res = await fetch(feedUrl, { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        items?: FeedItem[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Failed to load feed");
      const raw = body.items;
      const list = Array.isArray(raw) ? raw : [];
      setItems(list);
      if (!disableOfflineCache) {
        lkgSet(LKG_KEY.feed, list);
      }
    } catch (e) {
      if (!disableOfflineCache) {
        const cached = lkgGet<FeedItem[]>(LKG_KEY.feed);
        if (cached && cached.length > 0) {
          setItems(cached);
          setFromCache(true);
          mcaLog.event(
            "offline.lkg.restore",
            { surface: "feed" },
            { componentName: "GlobalFeedClient", surfaceName: "mobile" }
          );
        } else {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } else {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    } finally {
      setLoading(false);
    }
  }, [feedUrl, disableOfflineCache]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-mca-body text-mca-ink-muted">Loading feed…</p>;
  }

  if (error) {
    return (
      <p className="text-mca-caption text-mca-error-accent" role="alert">
        {error}
      </p>
    );
  }

  if (fromCache) {
    return (
      <div className="space-y-mca-md">
        <p className="text-mca-caption text-mca-hint" role="status">
          You appear offline — showing your last loaded feed.
        </p>
        <FeedList items={items} variant={variant} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
          <Panel className="rounded-mca-card border-mca-border bg-mca-surface/40 p-mca-md shadow-inner">
        <p className="text-mca-body text-mca-ink-muted">
          {variant === "profile"
            ? "No feed activity recorded for this trainer yet."
            : "No feed items yet — post in Community, follow trainers, or use marketplace offers."}
        </p>
      </Panel>
    );
  }

  return <FeedList items={items} variant={variant} />;
}

function FeedList({ items, variant }: { items: FeedItem[]; variant: "global" | "profile" }) {
  const showRankMeta = variant === "global";
  return (
    <ul className="touch-manipulation space-y-mca-md pb-[max(4rem,env(safe-area-inset-bottom))] md:pb-0">
      {items.map((it) => (
        <li key={it.id}>
          <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-panel active:bg-mca-chrome/30">
            <div className="flex flex-wrap items-baseline justify-between gap-mca-sm">
              <span className="rounded-full bg-mca-chrome px-mca-sm py-mca-trace text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-muted">
                {it.kind}
              </span>
              <time className="text-mca-caption text-mca-ink-muted" dateTime={it.created_at}>
                {new Date(it.created_at).toLocaleString()}
              </time>
            </div>
            {showRankMeta && it.signals ? (
              <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">
                Rank signals · mutual {it.signals.mutual?.toFixed(0) ?? "—"} · engagement{" "}
                {it.signals.engagement?.toFixed(0) ?? "—"} · ML {it.signals.ml_assist?.toFixed(4) ?? "—"}
              </p>
            ) : null}
            <p
              className="mt-mca-sm flex flex-wrap items-center gap-mca-xs text-mca-caption text-mca-ink-body"
              title={buildInlineIdentityProgressTitle(
                it.actor_journey_progress_summary,
                it.actor_collection_mastery_summary,
                it.actor_trade_reputation_score_summary,
                it.actor_top_trade_badge_key,
                {
                  personaText: it.actor_persona_text,
                  valueSummary: it.actor_value_identity_summary,
                  grailSummary: it.actor_grail_highlight_summary,
                  valueBadgeKey: it.actor_top_value_badge_key,
                  rarityProfileLabel: it.actor_rarity_profile_label,
                  fandomSummary: it.actor_fandom_summary,
                  activityStreakDays: it.actor_activity_streak,
                  activityWeekCount: it.actor_week_activity_count,
                  seasonHighlight: it.actor_season_highlight,
                  clubsSummary: it.actor_clubs_summary,
                  reputationSummary: it.actor_reputation_summary,
                  influenceSummary: it.actor_influence_summary,
                }
              )}
            >
              <InlineUserBadges
                tierSlug={it.actor_tier_slug}
                milestoneKey={it.actor_top_scan_milestone}
                journeyBadgeKey={it.actor_top_journey_badge_key}
                collectionMasteryBadgeKey={it.actor_top_collection_mastery_badge_key}
                tradeBadgeKey={it.actor_top_trade_badge_key}
                tradeReputationSummary={it.actor_trade_reputation_score_summary}
                playBadgeKey={it.actor_top_play_badge_key}
                valueBadgeKey={it.actor_top_value_badge_key}
                valueIdentitySummary={it.actor_value_identity_summary}
                fandomBadgeKey={it.actor_top_fandom_badge_key}
                fandomSummary={it.actor_fandom_summary}
              />
              <InlineUserFlair
                flairKey={it.actor_top_flair_key}
                secondaryFlairKey={it.actor_secondary_play_flair_key}
              />
              <InlineSeasonalEvent
                topSeasonalFlairKey={it.actor_top_seasonal_flair_key}
                topSeasonalBadgeKey={it.actor_top_seasonal_badge_key}
              />
              {it.actor_presence ? (
                <TrainerPresenceDot
                  lastSeenAt={it.actor_presence.lastSeenAt}
                  lastActivityAt={it.actor_presence.lastActivityAt}
                  lastActivityKey={it.actor_presence.lastActivityKey}
                  presenceOptOut={it.actor_presence.optedOut}
                  className="mt-0.5"
                />
              ) : null}
              <span className="font-medium text-mca-ink-strong">
                {it.actor_name?.trim() ? it.actor_name : "Anonymous Trainer"}
              </span>
            </p>
            {it.actor_season_highlight?.trim() ? (
              <p className="mt-mca-xs text-[11px] leading-snug text-mca-ink-subtle">{it.actor_season_highlight.trim()}</p>
            ) : null}
            {showRankMeta && typeof it.rank_score === "number" ? (
              <p className="mt-mca-xs text-mca-caption text-mca-hint tabular-nums">
                Rank score: {it.rank_score.toFixed(2)}
              </p>
            ) : null}
            <pre className="mt-mca-md max-h-40 overflow-auto rounded-mca-control border border-mca-border/60 bg-mca-surface/50 p-mca-sm text-[11px] text-mca-ink-muted">
              {JSON.stringify(it.payload, null, 2)}
            </pre>
          </Panel>
        </li>
      ))}
    </ul>
  );
}
