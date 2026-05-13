"use client";

import { InlineUserBadges } from "@/components/badges/inline-user-badges";
import { InlineUserFlair } from "@/components/flair/inline-user-flair";
import { InlineSeasonalEvent } from "@/components/seasonal/inline-seasonal-event";
import { TrainerPresenceDot } from "@/components/presence/trainer-presence-dot";
import {
  FEED_SURFACES_REFRESH_EVENT,
  requestFeedSurfacesRefresh,
} from "@/lib/feed/feed-surfaces-refresh";
import { requestSocialSurfacesRefresh } from "@/lib/social/social-surfaces-refresh";
import type {
  FeedHydratedItemDTO,
  FeedPageDTO,
  FeedSaveMutationDTO,
} from "@/lib/dto/feed";
import {
  fetchJson,
  fetchJsonErrorMessage,
  scheduleCoalescedRouterRefresh,
  useAsyncState,
} from "@/lib/client";
import { feedV3KindLabel } from "@/lib/feed/feed-v3-ui-copy";
import { LKG_KEY, lkgGet, lkgSet } from "@/lib/offline/surface-lkg";
import { buildInlineIdentityProgressTitle } from "@/lib/social/inline-identity-tooltip";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { isUuidString } from "@/lib/server/is-uuid";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { useRouter } from "next/navigation";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

function buildFeedRequestUrl(feedUrl: string, opts: { before?: string | null }): string {
  const u = new URL(feedUrl, "http://localhost");
  if (opts.before && opts.before.length > 0) {
    u.searchParams.set("before", opts.before);
  } else {
    u.searchParams.delete("before");
  }
  return u.pathname + u.search;
}

function parseFeedPageLimit(feedUrl: string, fallback: number): number {
  const u = new URL(feedUrl, "http://localhost");
  const raw = u.searchParams.get("limit");
  const n = raw != null ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.min(50, n) : fallback;
}

/** Oldest event in a batch — cursor for `before` on ranked/chronological feeds. */
function minCreatedAtIso(rows: FeedHydratedItemDTO[]): string | null {
  if (!rows.length) return null;
  let minT = Infinity;
  let iso = "";
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (!Number.isNaN(t) && t < minT) {
      minT = t;
      iso = r.created_at;
    }
  }
  return iso.length > 0 ? iso : null;
}

function dedupeAppend(prev: FeedHydratedItemDTO[], batch: FeedHydratedItemDTO[]): FeedHydratedItemDTO[] {
  const seen = new Set(prev.map((r) => r.id));
  const out = [...prev];
  for (const r of batch) {
    if (!seen.has(r.id)) {
      seen.add(r.id);
      out.push(r);
    }
  }
  return out;
}

export type GlobalFeedClientProps = {
  /** Override feed source (default: global ranked feed). */
  feedUrl?: string;
  /** `profile` hides ranking debug rows. */
  variant?: "global" | "profile";
  /** Skip offline last-known-good restore (e.g. embedded profile activity). */
  disableOfflineCache?: boolean;
  /** Enables save / nod controls on the global feed. */
  currentUserId?: string;
  /** Bumps to refetch feed (e.g. after refreshing social graph v4 on profile). */
  reloadKey?: number;
};

export function GlobalFeedClient({
  feedUrl = "/api/feed?limit=30",
  variant = "global",
  disableOfflineCache = false,
  currentUserId,
  reloadKey = 0,
}: GlobalFeedClientProps = {}) {
  const router = useRouter();
  const pageLimit = useMemo(() => parseFeedPageLimit(feedUrl, 30), [feedUrl]);

  const {
    data: feedRows,
    loading: feedLoading,
    error: feedError,
    setData: setFeedRows,
    setLoading: setFeedLoading,
    setError: setFeedError,
  } = useAsyncState<FeedHydratedItemDTO[]>();

  const items = feedRows ?? [];
  const loading = feedLoading || (feedRows === null && !feedError);
  const error = feedError;
  const [fromCache, setFromCache] = useState(false);
  const [savedPatch, setSavedPatch] = useState<Record<string, boolean>>({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [refreshBusy, setRefreshBusy] = useState(false);

  const loadSeqRef = useRef(0);
  const nextCursorRef = useRef<string | null>(null);
  const debounceReloadRef = useRef<number | null>(null);

  const fetchFeedPage = useCallback(
    async (opts: { append: boolean }) => {
      const seq = ++loadSeqRef.current;
      const beforeParam = opts.append ? nextCursorRef.current : null;
      const url = buildFeedRequestUrl(feedUrl, { before: beforeParam });

      const r = await fetchJson<FeedPageDTO>(url, { cache: "no-store" });
      if (seq !== loadSeqRef.current) return;

      if (r.kind !== "ok") {
        throw new Error(fetchJsonErrorMessage(r));
      }
      const batch = Array.isArray(r.data.items) ? r.data.items : [];
      nextCursorRef.current = minCreatedAtIso(batch);
      setHasMore(batch.length === pageLimit);

      if (opts.append) {
        setFeedRows((prev) => dedupeAppend(prev ?? [], batch));
      } else {
        setFeedRows(batch);
        setSavedPatch({});
        if (!disableOfflineCache) {
          lkgSet(LKG_KEY.feed, batch);
        }
      }
    },
    [disableOfflineCache, feedUrl, pageLimit, setFeedRows]
  );

  const load = useCallback(async () => {
    setFeedLoading(true);
    setFeedError(null);
    setFromCache(false);
    try {
      await fetchFeedPage({ append: false });
    } catch (e) {
      if (!disableOfflineCache) {
        const cached = lkgGet<FeedHydratedItemDTO[]>(LKG_KEY.feed);
        if (cached && cached.length > 0) {
          setFeedRows(cached);
          setFromCache(true);
          nextCursorRef.current = minCreatedAtIso(cached);
          setHasMore(false);
          mcaLog.event(
            "offline.lkg.restore",
            { surface: "feed" },
            { componentName: "GlobalFeedClient", surfaceName: "mobile" }
          );
        } else {
          setFeedError(e instanceof Error ? e.message : "Failed to load");
        }
      } else {
        setFeedError(e instanceof Error ? e.message : "Failed to load");
      }
    } finally {
      setFeedLoading(false);
    }
  }, [disableOfflineCache, fetchFeedPage, setFeedError, setFeedLoading, setFeedRows]);

  const scheduleDebouncedReload = useCallback(() => {
    if (debounceReloadRef.current !== null) window.clearTimeout(debounceReloadRef.current);
    debounceReloadRef.current = window.setTimeout(() => {
      debounceReloadRef.current = null;
      void load();
    }, 180);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  useEffect(() => {
    const onFeedRefresh = () => scheduleDebouncedReload();
    window.addEventListener(FEED_SURFACES_REFRESH_EVENT, onFeedRefresh);
    return () => window.removeEventListener(FEED_SURFACES_REFRESH_EVENT, onFeedRefresh);
  }, [scheduleDebouncedReload]);

  useEffect(() => {
    return () => {
      if (debounceReloadRef.current !== null) window.clearTimeout(debounceReloadRef.current);
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursorRef.current) return;
    setLoadingMore(true);
    try {
      await fetchFeedPage({ append: true });
    } catch (e) {
      setFeedError(e instanceof Error ? e.message : "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchFeedPage, hasMore, loadingMore, setFeedError]);

  const manualRefresh = useCallback(async () => {
    setRefreshBusy(true);
    setFeedError(null);
    try {
      await load();
      scheduleCoalescedRouterRefresh(router);
    } finally {
      setRefreshBusy(false);
    }
  }, [load, router, setFeedError]);

  const sectionBusy = loading || loadingMore || refreshBusy;

  return (
    <section
      aria-label={variant === "profile" ? "Profile activity feed" : "Global activity feed"}
      aria-live="polite"
      aria-busy={sectionBusy}
      className="min-w-0 space-y-mca-md overflow-x-hidden"
    >
      {!loading && !error ? (
        <div className="flex flex-wrap items-center justify-end gap-mca-sm">
          <Button
            type="button"
            variant="secondary"
            disabled={refreshBusy || loadingMore}
            className="text-xs"
            onClick={() => void manualRefresh()}
          >
            {refreshBusy ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-mca-body text-mca-ink-muted" role="status">
          Loading feed…
        </p>
      ) : null}

      {!loading && error ? (
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && fromCache ? (
        <>
          <p className="text-mca-caption text-mca-hint" role="status">
            You appear offline — showing your last loaded feed.
          </p>
          <FeedList
            items={items}
            variant={variant}
            currentUserId={currentUserId}
            savedPatch={savedPatch}
            onSavedPatchChange={setSavedPatch}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={() => void loadMore()}
          />
        </>
      ) : null}

      {!loading && !error && !fromCache && items.length === 0 ? (
        <Panel className="rounded-mca-card border-mca-border bg-mca-surface/40 p-mca-md shadow-inner">
          <p className="text-mca-body text-mca-ink-muted">
            {variant === "profile"
              ? "No feed activity recorded for this trainer yet."
              : "No feed items yet — post in Community, follow trainers, or use marketplace offers."}
          </p>
        </Panel>
      ) : null}

      {!loading && !error && !fromCache && items.length > 0 ? (
        <FeedList
          items={items}
          variant={variant}
          currentUserId={currentUserId}
          savedPatch={savedPatch}
          onSavedPatchChange={setSavedPatch}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={() => void loadMore()}
        />
      ) : null}
    </section>
  );
}

function FeedList({
  items,
  variant,
  currentUserId,
  savedPatch,
  onSavedPatchChange,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  items: FeedHydratedItemDTO[];
  variant: "global" | "profile";
  currentUserId?: string;
  savedPatch: Record<string, boolean>;
  onSavedPatchChange: Dispatch<SetStateAction<Record<string, boolean>>>;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const router = useRouter();
  const showRankMeta = variant === "global";
  const [saveBusyId, setSaveBusyId] = useState<string | null>(null);
  const [nodBusyFor, setNodBusyFor] = useState<string | null>(null);
  const [interactionMsg, setInteractionMsg] = useState<string | null>(null);

  const itemsRef = useRef(items);
  const savedPatchRef = useRef(savedPatch);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    savedPatchRef.current = savedPatch;
  }, [savedPatch]);

  const savedFor = useCallback(
    (it: FeedHydratedItemDTO) => {
      if (Object.prototype.hasOwnProperty.call(savedPatch, it.id)) {
        return savedPatch[it.id] ?? false;
      }
      return it.viewer_has_saved ?? false;
    },
    [savedPatch]
  );

  const saveSeqRef = useRef<Record<string, number>>({});

  const toggleSaveById = useCallback(
    async (feedEventId: string) => {
      const it = itemsRef.current.find((x) => x.id === feedEventId);
      if (!it?.id) return;
      const seq = (saveSeqRef.current[feedEventId] = (saveSeqRef.current[feedEventId] ?? 0) + 1);
      const baseSaved = it.viewer_has_saved ?? false;
      const patch = savedPatchRef.current;
      const patched = Object.prototype.hasOwnProperty.call(patch, feedEventId)
        ? patch[feedEventId]
        : undefined;
      const currentSaved = patched !== undefined ? patched : baseSaved;
      const next = !currentSaved;
      onSavedPatchChange((p) => ({ ...p, [feedEventId]: next }));
      setSaveBusyId(feedEventId);
      setInteractionMsg(null);
      try {
        if (next) {
          const r = await fetchJson<FeedSaveMutationDTO>("/api/feed/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ feedEventId }),
          });
          if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        } else {
          const r = await fetchJson<FeedSaveMutationDTO>(
            `/api/feed/save?feedEventId=${encodeURIComponent(feedEventId)}`,
            { method: "DELETE" }
          );
          if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        }
        if (saveSeqRef.current[feedEventId] !== seq) return;
        requestFeedSurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
      } catch (e) {
        if (saveSeqRef.current[feedEventId] === seq) {
          onSavedPatchChange((p) => {
            const n = { ...p };
            delete n[feedEventId];
            return n;
          });
        }
        setInteractionMsg(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaveBusyId(null);
      }
    },
    [onSavedPatchChange, router]
  );

  const sendNod = useCallback(
    async (actorId: string) => {
      setNodBusyFor(actorId);
      setInteractionMsg(null);
      try {
        const r = await fetchJson<{ ok: boolean }>("/api/social/nod", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toUserId: actorId }),
        });
        if (r.kind !== "ok") {
          if (r.kind === "error" && r.status === 429) {
            setInteractionMsg("You have reached the daily nod limit for this trainer.");
            return;
          }
          setInteractionMsg("Nod could not be sent right now.");
          return;
        }
        if (r.data.ok === false) {
          setInteractionMsg("Nod could not be sent right now.");
          return;
        }
        setInteractionMsg("Nod sent — a lightweight wave with no chat noise.");
        requestSocialSurfacesRefresh();
      } catch {
        setInteractionMsg("Nod could not be sent right now.");
      } finally {
        setNodBusyFor(null);
      }
    },
    [setInteractionMsg]
  );

  return (
    <>
      {interactionMsg ? (
        <p className="mb-mca-sm text-mca-caption text-mca-hint" role="status" aria-live="polite">
          {interactionMsg}
        </p>
      ) : null}
      <ul className="touch-manipulation space-y-mca-md pb-[max(4rem,env(safe-area-inset-bottom))] md:pb-0">
        {items.map((it) => (
          <li key={it.id}>
            <FeedRow
              item={it}
              showRankMeta={showRankMeta}
              saved={savedFor(it)}
              saveBusy={saveBusyId === it.id}
              nodBusy={it.actor_id ? nodBusyFor === it.actor_id : false}
              currentUserId={currentUserId}
              onToggleSave={toggleSaveById}
              onNod={sendNod}
            />
          </li>
        ))}
      </ul>
      {hasMore ? (
        <div className="flex justify-center pt-mca-sm">
          <Button
            type="button"
            variant="secondary"
            disabled={loadingMore || saveBusyId !== null}
            onClick={onLoadMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </>
  );
}

const FeedRow = memo(function FeedRow({
  item: it,
  showRankMeta,
  saved,
  saveBusy,
  nodBusy,
  currentUserId,
  onToggleSave,
  onNod,
}: {
  item: FeedHydratedItemDTO;
  showRankMeta: boolean;
  saved: boolean;
  saveBusy: boolean;
  nodBusy: boolean;
  currentUserId?: string;
  onToggleSave: (id: string) => void;
  onNod: (actorId: string) => void;
}) {
  return (
    <Panel className="rounded-mca-card border-mca-border bg-mca-surface-elevated/50 p-mca-md shadow-mca-panel active:bg-mca-chrome/30">
      <div className="flex flex-wrap items-baseline justify-between gap-mca-sm">
        <span className="rounded-full bg-mca-chrome px-mca-sm py-mca-trace text-mca-caption font-semibold uppercase tracking-wide text-mca-ink-muted">
          {feedV3KindLabel(it.kind)}
        </span>
        <time className="text-mca-caption text-mca-ink-muted" dateTime={it.created_at}>
          {new Date(it.created_at).toLocaleString()}
        </time>
      </div>
      {showRankMeta && it.signals ? (
        <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">
          Rank signals · mutual {it.signals.mutual?.toFixed(0) ?? "—"} · engagement{" "}
          {it.signals.engagement?.toFixed(0) ?? "—"} · ML {it.signals.ml_assist?.toFixed(4) ?? "—"}
          {typeof it.signals.identity_alignment === "number" ? (
            <>
              {" "}
              · identity {it.signals.identity_alignment.toFixed(0)} · presence{" "}
              {typeof it.signals.presence_proximity === "number"
                ? it.signals.presence_proximity.toFixed(0)
                : "—"}{" "}
              · cluster{" "}
              {typeof it.signals.cluster_fusion === "number" ? it.signals.cluster_fusion.toFixed(0) : "—"}
            </>
          ) : null}
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
            badgeHighlight: it.actor_badge_highlight,
            presenceLabel: it.actor_presence_label,
            personaV2Summary: it.actor_persona_v2_summary,
            identityMapSummary: it.actor_identity_summary,
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
            className="mt-mca-trace"
          />
        ) : null}
        <span className="font-medium text-mca-ink-strong">
          {it.actor_name?.trim() ? it.actor_name : "Anonymous Trainer"}
        </span>
      </p>
      {it.actor_season_highlight?.trim() ? (
        <p className="mt-mca-xs text-mca-caption leading-snug text-mca-ink-subtle">{it.actor_season_highlight.trim()}</p>
      ) : null}
      {it.actor_identity_headline?.trim() ? (
        <p className="mt-mca-xs text-mca-caption font-medium leading-snug text-mca-ink-strong">
          {it.actor_identity_headline.trim()}
        </p>
      ) : null}
      {it.actor_identity_summary?.trim() ? (
        <p className="mt-mca-xs text-mca-caption leading-snug text-mca-ink-body">{it.actor_identity_summary.trim()}</p>
      ) : null}
      {it.actor_persona_v2_summary?.trim() ? (
        <p className="mt-mca-xs text-mca-caption leading-snug text-mca-ink-body">{it.actor_persona_v2_summary.trim()}</p>
      ) : null}
      {it.actor_social_graph_echo?.trim() ? (
        <p className="mt-mca-xs text-mca-caption leading-snug text-mca-ink-subtle">{it.actor_social_graph_echo.trim()}</p>
      ) : null}
      {it.feed_v3_signal_line?.trim() ? (
        <aside
          className="mt-mca-sm rounded-mca-control border border-mca-border/70 bg-mca-chrome/35 px-mca-sm py-mca-trace"
          aria-label="Why you are seeing this activity"
        >
          <p className="text-mca-caption leading-snug text-mca-ink-body">
            <span className="font-semibold text-mca-ink-muted">Why you&apos;re seeing this:</span>{" "}
            {it.feed_v3_signal_line.trim()}
          </p>
        </aside>
      ) : null}
      {it.actor_badge_highlight?.trim() ? (
        <p className="mt-mca-xs text-[11px] leading-snug text-mca-accent-strong/85">{it.actor_badge_highlight.trim()}</p>
      ) : null}
      {it.actor_presence_label?.trim() ? (
        <p className="mt-mca-xs text-[11px] leading-snug text-mca-ink-subtle">{it.actor_presence_label.trim()}</p>
      ) : null}
      {showRankMeta && typeof it.rank_score === "number" ? (
        <p className="mt-mca-xs text-mca-caption text-mca-hint tabular-nums">
          Rank score: {it.rank_score.toFixed(2)}
          {it.ranking?.v4 && typeof it.ranking.v4.combined === "number" ? (
            <span className="ml-mca-xs block sm:inline">
              · relevance (v4 combined) {it.ranking.v4.combined.toFixed(3)}
            </span>
          ) : null}
        </p>
      ) : null}
      {currentUserId ? (
        <div className="mt-mca-md flex flex-wrap gap-mca-sm">
          {isUuidString(it.id) ? (
            <Button
              type="button"
              variant="secondary"
              disabled={saveBusy}
              aria-pressed={saved}
              aria-label={saved ? "Remove saved feed item" : "Save feed item to your list"}
              className="text-xs"
              onClick={() => onToggleSave(it.id)}
            >
              {saved ? "Saved" : "Save"}
            </Button>
          ) : null}
          {it.actor_id !== currentUserId ? (
            <Button
              type="button"
              variant="tertiary"
              disabled={nodBusy}
              aria-label="Send this trainer a nod (lightweight acknowledgement, not a message)"
              className="text-xs"
              onClick={() => onNod(it.actor_id)}
            >
              Nod
            </Button>
          ) : null}
        </div>
      ) : null}
      {it.kind === "showcase_created" && it.payload && typeof it.payload.title === "string" ? (
        <p className="mt-mca-sm rounded-mca-control border border-mca-border/70 bg-mca-surface/40 px-mca-sm py-mca-xs text-sm text-mca-ink-body">
          <span className="font-semibold text-mca-ink-strong">Showcase:</span> {it.payload.title}
        </p>
      ) : null}
      {it.kind === "trade_completed" ? (
        <p className="mt-mca-sm rounded-mca-control border border-mca-border/70 bg-mca-surface/40 px-mca-sm py-mca-xs text-sm text-mca-ink-body">
          Pokémon TCG trade marked completed — celebration-friendly signal without payment detail.
        </p>
      ) : null}
      {it.kind === "follow_edge_created" ? (
        <p className="mt-mca-sm rounded-mca-control border border-mca-border/70 bg-mca-surface/40 px-mca-sm py-mca-xs text-sm text-mca-ink-body">
          Follow activity — trainers you watch are connecting.
        </p>
      ) : null}
      <pre className="mt-mca-md max-h-40 overflow-auto rounded-mca-control border border-mca-border/60 bg-mca-surface/50 p-mca-sm text-[11px] text-mca-ink-muted">
        {JSON.stringify(it.payload ?? {}, null, 2)}
      </pre>
    </Panel>
  );
});

/** Semantic alias for trainer-profile activity feeds (`variant="profile"`). Same behavior as {@link GlobalFeedClient}. */
export const ProfileFeedClient = GlobalFeedClient;
