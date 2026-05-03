"use client";

import { InlineUserBadges } from "@/components/badges/inline-user-badges";
import { InlineUserFlair } from "@/components/flair/inline-user-flair";
import { TrainerPresenceDot } from "@/components/presence/trainer-presence-dot";
import { InlineSeasonalEvent } from "@/components/seasonal/inline-seasonal-event";
import {
  COMMUNITY_SURFACES_REFRESH_EVENT,
  requestCommunitySurfacesRefresh,
} from "@/lib/community/community-surfaces-refresh";
import { requestFeedSurfacesRefresh } from "@/lib/feed/feed-surfaces-refresh";
import {
  fetchJson,
  fetchJsonErrorMessage,
  scheduleCoalescedRouterRefresh,
  useAsyncState,
} from "@/lib/client";
import type {
  CommunityCommentDTO,
  CommunityFeedPageDTO,
  CommunityFeedPostDTO,
  CommunityLikeMutationDTO,
  CommunityReactionMutationDTO,
} from "@/lib/dto/community-feed";
import type { CommunityPostDTO as CommunityPostApiRowDTO } from "@/lib/dto/catalog";
import {
  enqueueOfflineAction,
  finalizeOfflineAction,
  isLikelyOfflineError,
  listOfflineActions,
} from "@/lib/mobile/offline-action-queue";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { buildInlineIdentityProgressTitle } from "@/lib/social/inline-identity-tooltip";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

type FeedPost = CommunityFeedPostDTO;
type CommentRow = CommunityCommentDTO;

function dedupeAppendPosts(prev: FeedPost[], batch: FeedPost[]): FeedPost[] {
  const seen = new Set(prev.map((p) => p.id));
  const out = [...prev];
  for (const p of batch) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

const PAGE_SIZE = 24;

const REACTIONS = ["👍", "❤️", "🔥", "😂", "🎉", "🎴", "⚡", "✨"] as const;

const EMPTY_POSTS: FeedPost[] = [];

const REACTION_ARIA: Record<(typeof REACTIONS)[number], string> = {
  "👍": "Thumbs up",
  "❤️": "Heart",
  "🔥": "Fire",
  "😂": "Laughing",
  "🎉": "Celebrate",
  "🎴": "Card nod",
  "⚡": "Energy spark",
  "✨": "Highlight sparkle",
};

export function CommunityFeedClient({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const {
    data: postsData,
    loading: postsLoading,
    error: postsError,
    setData: setPostsData,
    setLoading: setPostsLoading,
    setError: setPostsError,
  } = useAsyncState<FeedPost[]>();
  const posts = postsData ?? EMPTY_POSTS;
  const loading = postsLoading || (postsData === null && !postsError);
  const [actionError, setActionError] = useState<string | null>(null);
  const surfaceError = postsError ?? actionError;
  const [composer, setComposer] = useState("");
  const [actionPostId, setActionPostId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, CommentRow[] | "loading" | undefined>>({});
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const postsRef = useRef<FeedPost[]>([]);
  const loadSeqRef = useRef(0);
  const likeSeqRef = useRef<Record<string, number>>({});
  const debounceReloadRef = useRef<number | null>(null);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      const seq = ++loadSeqRef.current;
      const r = await fetchJson<CommunityFeedPageDTO & { success?: boolean }>(
        `/api/community/posts?limit=${PAGE_SIZE}&offset=${offset}`,
        { cache: "no-store" }
      );
      if (seq !== loadSeqRef.current) return;
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      const next = Array.isArray(r.data.posts) ? r.data.posts : [];
      if (append) {
        setPostsData((prev) => dedupeAppendPosts(prev ?? [], next));
      } else {
        setPostsData(next);
      }
      setNextOffset(offset + next.length);
      setHasMore(next.length === PAGE_SIZE);
    },
    [setPostsData]
  );

  const reloadFeed = useCallback(async () => {
    setPostsLoading(true);
    setPostsError(null);
    try {
      await fetchPage(0, false);
    } catch (e) {
      setPostsError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setPostsLoading(false);
    }
  }, [fetchPage, setPostsError, setPostsLoading]);

  const scheduleDebouncedReload = useCallback(() => {
    if (debounceReloadRef.current) clearTimeout(debounceReloadRef.current);
    debounceReloadRef.current = window.setTimeout(() => {
      debounceReloadRef.current = null;
      void reloadFeed();
    }, 180);
  }, [reloadFeed]);

  useEffect(() => {
    void reloadFeed();
  }, [reloadFeed]);

  useEffect(() => {
    const onRefresh = () => scheduleDebouncedReload();
    window.addEventListener(COMMUNITY_SURFACES_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(COMMUNITY_SURFACES_REFRESH_EVENT, onRefresh);
  }, [scheduleDebouncedReload]);

  useEffect(() => {
    return () => {
      if (debounceReloadRef.current !== null) {
        window.clearTimeout(debounceReloadRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const flush = async () => {
      const pending = listOfflineActions().filter((a) => a.kind === "community_post_draft");
      for (const p of pending) {
        if (p.kind !== "community_post_draft") continue;
        try {
          const r = await fetchJson("/api/community/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: p.body }),
          });
          if (r.kind === "ok") {
            finalizeOfflineAction(p.id, "synced");
            mcaLog.event(
              "mobile.offline.queue",
              { kind: "community_post_draft", op: "flush_ok", id: p.id },
              { componentName: "CommunityFeedClient", surfaceName: "mobile" }
            );
            await reloadFeed();
            requestCommunitySurfacesRefresh();
            requestFeedSurfacesRefresh();
            scheduleCoalescedRouterRefresh(router);
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    };
    void flush();
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [reloadFeed, router]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setActionError(null);
    try {
      await fetchPage(nextOffset, true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Could not load more");
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore, nextOffset]);

  const onPost = useCallback(async () => {
    const text = composer.trim();
    if (!text) return;
    setActionPostId("_composer");
    setActionError(null);
    try {
      const r = await fetchJson<{ post?: CommunityPostApiRowDTO }>("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      setComposer("");
      await reloadFeed();
      requestCommunitySurfacesRefresh();
      requestFeedSurfacesRefresh();
      scheduleCoalescedRouterRefresh(router);
    } catch (e) {
      if (isLikelyOfflineError(e)) {
        enqueueOfflineAction({ kind: "community_post_draft", body: text });
        setActionError("Offline — post queued to send when you are back online.");
        mcaLog.event(
          "mobile.offline.queue",
          { kind: "community_post_draft", op: "enqueue" },
          { componentName: "CommunityFeedClient", surfaceName: "mobile" }
        );
      } else {
        setActionError(e instanceof Error ? e.message : "Could not post");
      }
    } finally {
      setActionPostId(null);
    }
  }, [composer, reloadFeed, router]);

  const onToggleLike = useCallback(
    async (postId: string) => {
      setActionError(null);
      const prevPost = postsRef.current.find((p) => p.id === postId);
      if (!prevPost) return;
      const seq = (likeSeqRef.current[postId] = (likeSeqRef.current[postId] ?? 0) + 1);
      setActionPostId(postId);
      setPostsData((prev) =>
        (prev ?? []).map((p) => {
          if (p.id !== postId) return p;
          const liked = !p.liked_by_viewer;
          const delta = liked ? 1 : -1;
          return {
            ...p,
            liked_by_viewer: liked,
            like_count: Math.max(0, p.like_count + delta),
          };
        })
      );
      try {
        const r = await fetchJson<CommunityLikeMutationDTO & { success?: boolean }>(
          `/api/community/posts/${encodeURIComponent(postId)}/like`,
          { method: "POST" }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        if (likeSeqRef.current[postId] !== seq) return;
        const liked = Boolean(r.data.liked);
        setPostsData((prev) =>
          (prev ?? []).map((p) => (p.id === postId ? { ...p, liked_by_viewer: liked } : p))
        );
        requestCommunitySurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
      } catch (e) {
        if (likeSeqRef.current[postId] === seq && prevPost) {
          setPostsData((prev) =>
            (prev ?? []).map((p) => (p.id === postId ? { ...prevPost } : p))
          );
        }
        setActionError(e instanceof Error ? e.message : "Could not update like");
      } finally {
        setActionPostId(null);
      }
    },
    [router, setPostsData]
  );

  const loadComments = useCallback(async (postId: string) => {
    setExpanded((e) => ({ ...e, [postId]: "loading" }));
    try {
      const r = await fetchJson<{ comments: CommentRow[] }>(
        `/api/community/posts/${encodeURIComponent(postId)}/comments`,
        { cache: "no-store" }
      );
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      setExpanded((e) => ({ ...e, [postId]: r.data.comments ?? [] }));
    } catch {
      setExpanded((e) => ({ ...e, [postId]: [] }));
    }
  }, []);

  const onComment = useCallback(
    async (postId: string, text: string, parentCommentId?: string | null) => {
      setActionPostId(postId);
      setActionError(null);
      try {
        const r = await fetchJson(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: text,
            parent_comment_id: parentCommentId ?? null,
          }),
        });
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        setPostsData((prev) =>
          (prev ?? []).map((p) =>
            p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
          )
        );
        await loadComments(postId);
        requestCommunitySurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Could not comment");
      } finally {
        setActionPostId(null);
      }
    },
    [loadComments, router, setPostsData]
  );

  const onToggleReaction = useCallback(
    async (postId: string, reaction: string) => {
      setActionPostId(postId);
      setActionError(null);
      try {
        const r = await fetchJson<CommunityReactionMutationDTO & { success?: boolean }>(
          `/api/community/posts/${encodeURIComponent(postId)}/reactions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reaction }),
          }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        const active = Boolean(r.data.active);
        setPostsData((prev) =>
          (prev ?? []).map((p) => {
            if (p.id !== postId) return p;
            const counts = { ...(p.reaction_counts ?? {}) };
            const cur = counts[reaction] ?? 0;
            if (active) counts[reaction] = cur + 1;
            else counts[reaction] = Math.max(0, cur - 1);
            const mine = new Set(p.viewer_reactions ?? []);
            if (active) mine.add(reaction);
            else mine.delete(reaction);
            return {
              ...p,
              reaction_counts: counts,
              viewer_reactions: [...mine],
            };
          })
        );
        requestCommunitySurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Could not react");
      } finally {
        setActionPostId(null);
      }
    },
    [router, setPostsData]
  );

  const onHideComment = useCallback(
    async (postId: string, commentId: string, hidden: boolean) => {
      setActionPostId(postId);
      setActionError(null);
      try {
        const r = await fetchJson(
          `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/hide`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hidden }),
          }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        await loadComments(postId);
        requestCommunitySurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Could not update comment");
      } finally {
        setActionPostId(null);
      }
    },
    [loadComments, router]
  );

  const onDeleteComment = useCallback(
    async (postId: string, commentId: string) => {
      setActionPostId(postId);
      setActionError(null);
      const prevExpanded = expanded[postId];
      if (Array.isArray(prevExpanded)) {
        setExpanded((e) => ({
          ...e,
          [postId]: prevExpanded.filter((c) => c.id !== commentId),
        }));
      }
      setPostsData((prev) =>
        (prev ?? []).map((p) =>
          p.id === postId ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p
        )
      );
      try {
        const r = await fetchJson(
          `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
          { method: "DELETE" }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        await loadComments(postId);
        requestCommunitySurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
      } catch (e) {
        if (Array.isArray(prevExpanded)) {
          setExpanded((ex) => ({ ...ex, [postId]: prevExpanded }));
        }
        setPostsData((prev) =>
          (prev ?? []).map((p) =>
            p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
          )
        );
        setActionError(e instanceof Error ? e.message : "Could not delete comment");
      } finally {
        setActionPostId(null);
      }
    },
    [expanded, loadComments, router, setPostsData]
  );

  const onDeletePost = useCallback(
    async (postId: string) => {
      if (!window.confirm("Delete this post? This cannot be undone.")) return;
      setActionPostId(postId);
      setActionError(null);
      try {
        const r = await fetchJson(`/api/community/posts/${encodeURIComponent(postId)}`, {
          method: "DELETE",
        });
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        setExpanded((e) => {
          const next = { ...e };
          delete next[postId];
          return next;
        });
        setPostsData((prev) => (prev ?? []).filter((p) => p.id !== postId));
        setEditingPostId((id) => (id === postId ? null : id));
        await reloadFeed();
        requestCommunitySurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Could not delete post");
      } finally {
        setActionPostId(null);
      }
    },
    [reloadFeed, router, setPostsData]
  );

  const toggleCommentsPanel = useCallback(
    (postId: string) => {
      setExpanded((e) => {
        const cur = e[postId];
        if (cur && cur !== "loading") {
          const next = { ...e };
          delete next[postId];
          return next;
        }
        void loadComments(postId);
        return e;
      });
    },
    [loadComments]
  );

  const beginEditPost = useCallback((postId: string) => {
    const row = postsRef.current.find((x) => x.id === postId);
    setEditingPostId(postId);
    setEditDraft(row?.body ?? "");
  }, []);

  const cancelEditPost = useCallback(() => {
    setEditingPostId(null);
    setEditDraft("");
  }, []);

  const onSaveEdit = useCallback(
    async (postId: string) => {
      const text = editDraft.trim();
      if (!text) return;
      setActionPostId(postId);
      setActionError(null);
      try {
        const r = await fetchJson<{ post?: CommunityPostApiRowDTO }>(
          `/api/community/posts/${encodeURIComponent(postId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text }),
          }
        );
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        setPostsData((prev) =>
          (prev ?? []).map((p) => (p.id === postId ? { ...p, body: text } : p))
        );
        cancelEditPost();
        requestCommunitySurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
      } catch (e) {
        setActionError(e instanceof Error ? e.message : "Could not save edit");
      } finally {
        setActionPostId(null);
      }
    },
    [cancelEditPost, editDraft, router, setPostsData]
  );

  const busyComposer = actionPostId === "_composer";
  const sectionBusy = loading || actionPostId !== null || loadingMore;

  return (
    <section
      aria-label="Community feed"
      aria-live="polite"
      aria-busy={sectionBusy}
      className="touch-manipulation min-w-0 overflow-x-hidden space-y-mca-xl"
    >
      {loading ? (
        <p className="text-mca-body text-mca-ink-muted" role="status">
          Loading community…
        </p>
      ) : null}

      {surfaceError ? (
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {surfaceError}
        </p>
      ) : null}

      {!loading ? (
        <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            New post
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-hint">
            Lightweight discussion — not trade execution. Keep it kind and Pokémon-focused.
          </p>
          <Field id="community-composer" label="Message" className="mt-mca-md">
            <textarea
              id="community-composer"
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              rows={4}
              maxLength={8000}
              placeholder="Share a deck idea, a set pull, or a binder tip…"
              className="mca-input mt-mca-sm resize-y text-sm text-mca-body"
            />
          </Field>
          <div className="mt-mca-md flex justify-end">
            <Button
              type="button"
              disabled={busyComposer || !composer.trim()}
              onClick={() => void onPost()}
            >
              Post
            </Button>
          </div>
        </Panel>
      ) : null}

      {!loading ? (
        <div className="space-y-mca-md">
          {posts.length === 0 ? (
            <p className="text-mca-caption text-mca-ink-subtle">No posts yet — be the first.</p>
          ) : (
            posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                currentUserId={currentUserId}
                isBusy={actionPostId === p.id}
                commentsState={expanded[p.id]}
                isEditing={editingPostId === p.id}
                editDraft={editingPostId === p.id ? editDraft : ""}
                onEditDraftChange={setEditDraft}
                onToggleReaction={onToggleReaction}
                onToggleLike={onToggleLike}
                onToggleComments={toggleCommentsPanel}
                onSubmitComment={onComment}
                onHideComment={onHideComment}
                onDeleteComment={onDeleteComment}
                onDeletePost={onDeletePost}
                onStartEdit={beginEditPost}
                onCancelEdit={cancelEditPost}
                onSaveEdit={onSaveEdit}
              />
            ))
          )}
          {hasMore ? (
            <div className="flex justify-center pt-mca-sm">
              <Button
                type="button"
                variant="secondary"
                disabled={loadingMore || actionPostId !== null}
                onClick={() => void loadMore()}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function CommentThread({
  comments,
  postAuthorId,
  currentUserId,
  busy,
  setReplyTo,
  onHideComment,
  onDeleteComment,
}: {
  comments: CommentRow[];
  postAuthorId: string;
  currentUserId: string;
  busy: boolean;
  setReplyTo: (id: string | null) => void;
  onHideComment: (commentId: string, hidden: boolean) => void;
  onDeleteComment: (commentId: string) => void;
}) {
  const roots = useMemo(
    () => comments.filter((c) => !c.parent_comment_id),
    [comments]
  );
  const children: Record<string, CommentRow[]> = useMemo(() => {
    const ch: Record<string, CommentRow[]> = {};
    for (const c of comments) {
      const pid = c.parent_comment_id;
      if (pid) {
        if (!ch[pid]) ch[pid] = [];
        ch[pid].push(c);
      }
    }
    return ch;
  }, [comments]);

  const renderOne = (c: CommentRow, depth: number) => {
    const isPostOwner = postAuthorId === currentUserId;
    const isOwnComment = c.author_id === currentUserId;
    const hiddenLabel = c.hidden === true ? " (hidden)" : "";
    return (
      <div
        key={c.id}
        className={`rounded-mca-control border border-mca-border/60 bg-mca-surface/40 px-mca-sm py-mca-xs ${depth > 0 ? "ml-mca-md border-l-2 border-mca-accent/30" : ""}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-mca-sm">
          <p
            className="flex min-w-0 flex-wrap items-center gap-mca-xs text-mca-caption font-medium text-mca-ink-strong"
            title={buildInlineIdentityProgressTitle(
              c.author_journey_progress_summary,
              c.author_collection_mastery_summary,
              c.author_trade_reputation_score_summary,
              c.author_top_trade_badge_key,
              {
                personaText: c.author_persona_text,
                valueSummary: c.author_value_identity_summary,
                grailSummary: c.author_grail_highlight_summary,
                valueBadgeKey: c.author_top_value_badge_key,
                rarityProfileLabel: c.author_rarity_profile_label,
                fandomSummary: c.author_fandom_summary,
                clubsSummary: c.author_clubs_summary,
                reputationSummary: c.author_reputation_summary,
                influenceSummary: c.author_influence_summary,
                badgeHighlight: c.author_badge_highlight,
                presenceLabel: c.author_presence_label,
                personaV2Summary: c.author_persona_v2_summary,
                identityMapSummary: c.author_identity_summary,
              }
            )}
          >
            <InlineUserBadges
              tierSlug={c.author_tier_slug}
              milestoneKey={c.author_top_scan_milestone}
              journeyBadgeKey={c.author_top_journey_badge_key}
              collectionMasteryBadgeKey={c.author_top_collection_mastery_badge_key}
              tradeBadgeKey={c.author_top_trade_badge_key}
              tradeReputationSummary={c.author_trade_reputation_score_summary}
              playBadgeKey={c.author_top_play_badge_key}
              valueBadgeKey={c.author_top_value_badge_key}
              valueIdentitySummary={c.author_value_identity_summary}
              fandomBadgeKey={c.author_top_fandom_badge_key}
              fandomSummary={c.author_fandom_summary}
            />
            <InlineUserFlair
              flairKey={c.author_top_flair_key}
              secondaryFlairKey={c.author_secondary_play_flair_key}
            />
            <InlineSeasonalEvent
              topSeasonalFlairKey={c.author_top_seasonal_flair_key}
              topSeasonalBadgeKey={c.author_top_seasonal_badge_key}
            />
            {c.author_presence ? (
              <TrainerPresenceDot
                lastSeenAt={c.author_presence.lastSeenAt}
                lastActivityAt={c.author_presence.lastActivityAt}
                lastActivityKey={c.author_presence.lastActivityKey}
                presenceOptOut={c.author_presence.optedOut}
                className="mt-mca-trace"
              />
            ) : null}
            <span>
              {c.author_display}
              {hiddenLabel ? <span className="text-mca-ink-subtle">{hiddenLabel}</span> : null}
            </span>
          </p>
          <div className="flex flex-wrap gap-mca-xs">
            <Button
              type="button"
              variant="tertiary"
              className="text-mca-caption"
              disabled={busy}
              onClick={() => setReplyTo(c.id)}
            >
              Reply
            </Button>
            {isOwnComment ? (
              <Button
                type="button"
                variant="tertiary"
                className="text-mca-caption text-mca-error-accent"
                disabled={busy}
                onClick={() => onDeleteComment(c.id)}
              >
                Delete
              </Button>
            ) : null}
            {isPostOwner ? (
              <Button
                type="button"
                variant="tertiary"
                className="text-mca-caption text-mca-error-accent"
                disabled={busy}
                onClick={() => onHideComment(c.id, c.hidden !== true)}
              >
                {c.hidden === true ? "Unhide" : "Hide"}
              </Button>
            ) : null}
          </div>
        </div>
        {c.author_presence_label?.trim() ? (
          <p className="mt-mca-micro text-mca-caption leading-snug text-mca-ink-subtle">{c.author_presence_label.trim()}</p>
        ) : null}
        {c.author_identity_headline?.trim() ? (
          <p className="mt-mca-micro text-mca-caption font-medium leading-snug text-mca-ink-strong">
            {c.author_identity_headline.trim()}
          </p>
        ) : null}
        {c.author_identity_summary?.trim() ? (
          <p className="mt-mca-micro text-mca-caption leading-snug text-mca-ink-body">{c.author_identity_summary.trim()}</p>
        ) : null}
        {c.author_persona_v2_summary?.trim() ? (
          <p className="mt-mca-micro text-mca-caption leading-snug text-mca-ink-body">{c.author_persona_v2_summary.trim()}</p>
        ) : null}
        <p className="mt-mca-trace whitespace-pre-wrap text-mca-caption text-mca-ink-body">{c.body}</p>
        {(children[c.id] ?? []).map((ch) => renderOne(ch, depth + 1))}
      </div>
    );
  };

  return (
    <div aria-live="polite" aria-relevant="additions text">
      {roots.length === 0 ? (
        <p className="text-mca-caption text-mca-ink-subtle">No comments yet.</p>
      ) : (
        roots.map((c) => renderOne(c, 0))
      )}
    </div>
  );
}

const PostCard = memo(function PostCard({
  post,
  currentUserId,
  isBusy,
  commentsState,
  isEditing,
  editDraft,
  onEditDraftChange,
  onToggleReaction,
  onToggleLike,
  onToggleComments,
  onSubmitComment,
  onHideComment,
  onDeleteComment,
  onDeletePost,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: {
  post: FeedPost;
  currentUserId: string;
  isBusy: boolean;
  commentsState: CommentRow[] | "loading" | undefined;
  isEditing: boolean;
  editDraft: string;
  onEditDraftChange: (v: string) => void;
  onToggleReaction: (postId: string, reaction: string) => void | Promise<void>;
  onToggleLike: (postId: string) => void | Promise<void>;
  onToggleComments: (postId: string) => void;
  onSubmitComment: (postId: string, text: string, parentCommentId?: string | null) => void | Promise<void>;
  onHideComment: (postId: string, commentId: string, hidden: boolean) => void | Promise<void>;
  onDeleteComment: (postId: string, commentId: string) => void | Promise<void>;
  onDeletePost: (postId: string) => void | Promise<void>;
  onStartEdit: (postId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (postId: string) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const isOwn = post.author_id === currentUserId;
  const counts = post.reaction_counts ?? {};
  const mine = useMemo(() => new Set(post.viewer_reactions ?? []), [post.viewer_reactions]);

  return (
    <Panel className="border-mca-border bg-mca-surface-elevated/50 p-mca-md">
      <div className="flex flex-wrap items-baseline justify-between gap-mca-sm">
        <p
          className="flex min-w-0 flex-wrap items-center gap-mca-xs text-sm font-semibold text-mca-ink-strong"
          title={buildInlineIdentityProgressTitle(
            post.author_journey_progress_summary,
            post.author_collection_mastery_summary,
            post.author_trade_reputation_score_summary,
            post.author_top_trade_badge_key,
            {
              personaText: post.author_persona_text,
              valueSummary: post.author_value_identity_summary,
              grailSummary: post.author_grail_highlight_summary,
              valueBadgeKey: post.author_top_value_badge_key,
              rarityProfileLabel: post.author_rarity_profile_label,
              fandomSummary: post.author_fandom_summary,
              clubsSummary: post.author_clubs_summary,
              reputationSummary: post.author_reputation_summary,
              influenceSummary: post.author_influence_summary,
              badgeHighlight: post.author_badge_highlight,
              presenceLabel: post.author_presence_label,
              personaV2Summary: post.author_persona_v2_summary,
              identityMapSummary: post.author_identity_summary,
            }
          )}
        >
          <InlineUserBadges
            tierSlug={post.author_tier_slug}
            milestoneKey={post.author_top_scan_milestone}
            journeyBadgeKey={post.author_top_journey_badge_key}
            collectionMasteryBadgeKey={post.author_top_collection_mastery_badge_key}
            tradeBadgeKey={post.author_top_trade_badge_key}
            tradeReputationSummary={post.author_trade_reputation_score_summary}
            playBadgeKey={post.author_top_play_badge_key}
            valueBadgeKey={post.author_top_value_badge_key}
            valueIdentitySummary={post.author_value_identity_summary}
            fandomBadgeKey={post.author_top_fandom_badge_key}
            fandomSummary={post.author_fandom_summary}
          />
          <InlineUserFlair
            flairKey={post.author_top_flair_key}
            secondaryFlairKey={post.author_secondary_play_flair_key}
          />
          <InlineSeasonalEvent
            topSeasonalFlairKey={post.author_top_seasonal_flair_key}
            topSeasonalBadgeKey={post.author_top_seasonal_badge_key}
          />
          {post.author_presence ? (
            <TrainerPresenceDot
              lastSeenAt={post.author_presence.lastSeenAt}
              lastActivityAt={post.author_presence.lastActivityAt}
              lastActivityKey={post.author_presence.lastActivityKey}
              presenceOptOut={post.author_presence.optedOut}
              className="mt-mca-trace"
            />
          ) : null}
          <span className="truncate">{post.author_display}</span>
        </p>
        <time className="shrink-0 text-mca-caption text-mca-ink-muted" dateTime={post.created_at}>
          {new Date(post.created_at).toLocaleString()}
        </time>
      </div>
      {post.author_identity_headline?.trim() ? (
        <p className="mt-mca-xs text-mca-caption font-medium leading-snug text-mca-ink-strong">
          {post.author_identity_headline.trim()}
        </p>
      ) : null}
      {post.author_identity_summary?.trim() ? (
        <p className="mt-mca-xs text-mca-caption leading-snug text-mca-ink-body">{post.author_identity_summary.trim()}</p>
      ) : null}
      {post.author_persona_v2_summary?.trim() ? (
        <p className="mt-mca-xs text-mca-caption leading-snug text-mca-ink-body">{post.author_persona_v2_summary.trim()}</p>
      ) : null}
      {post.author_badge_highlight?.trim() ? (
        <p className="mt-mca-xs text-mca-caption leading-snug text-mca-warn/95">{post.author_badge_highlight.trim()}</p>
      ) : null}
      {post.author_presence_label?.trim() ? (
        <p className="mt-mca-micro text-mca-caption leading-snug text-mca-ink-subtle">{post.author_presence_label.trim()}</p>
      ) : null}

      {isEditing ? (
        <Field id={`community-edit-${post.id}`} label="Edit post" className="mt-mca-sm">
          <textarea
            id={`community-edit-${post.id}`}
            value={editDraft}
            onChange={(e) => onEditDraftChange(e.target.value)}
            rows={4}
            maxLength={8000}
            className="mca-input mt-mca-sm resize-y text-sm text-mca-body"
          />
        </Field>
      ) : (
        <p className="mt-mca-sm whitespace-pre-wrap text-mca-body text-mca-ink-body">{post.body}</p>
      )}

      <div className="mt-mca-md flex flex-wrap gap-mca-xs">
        {REACTIONS.map((em) => {
          const n = counts[em] ?? 0;
          const active = mine.has(em);
          return (
            <button
              key={em}
              type="button"
              disabled={isBusy}
              aria-label={`${REACTION_ARIA[em]} reaction${active ? ", selected" : ""}`}
              aria-pressed={active}
              onClick={() => void onToggleReaction(post.id, em)}
              className={`rounded-full border px-mca-sm py-mca-trace text-sm transition duration-200 ease-mca-standard ${
                active
                  ? "border-mca-accent-strong bg-mca-accent-strong/15 text-mca-ink-strong"
                  : "border-mca-border/80 bg-mca-surface/50 text-mca-ink-muted hover:border-mca-accent/40"
              }`}
            >
              {em} {n > 0 ? <span className="tabular-nums text-mca-caption">{n}</span> : null}
            </button>
          );
        })}
      </div>
      <div className="mt-mca-md flex flex-wrap gap-mca-sm">
        <Button
          type="button"
          variant={post.liked_by_viewer ? "primary" : "secondary"}
          disabled={isBusy}
          onClick={() => void onToggleLike(post.id)}
          className="text-mca-caption"
        >
          {post.liked_by_viewer ? "♥ Liked" : "♡ Like"} · {post.like_count}
        </Button>
        <Button
          type="button"
          variant="tertiary"
          disabled={isBusy}
          onClick={() => onToggleComments(post.id)}
          className="text-mca-caption"
        >
          Comments · {post.comment_count}
        </Button>
        {isOwn ? (
          <>
            {isEditing ? (
              <>
                <Button type="button" variant="secondary" disabled={isBusy} onClick={() => void onSaveEdit(post.id)}>
                  Save
                </Button>
                <Button type="button" variant="tertiary" disabled={isBusy} onClick={onCancelEdit}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" disabled={isBusy} onClick={() => onStartEdit(post.id)}>
                  Edit
                </Button>
                <Button type="button" variant="destructive" disabled={isBusy} onClick={() => void onDeletePost(post.id)}>
                  Delete
                </Button>
              </>
            )}
          </>
        ) : null}
      </div>

      {commentsState === "loading" ? (
        <p className="mt-mca-md text-mca-caption text-mca-ink-muted" aria-busy>
          Loading comments…
        </p>
      ) : Array.isArray(commentsState) ? (
        <div className="mt-mca-md space-y-mca-sm border-t border-mca-border/80 pt-mca-md">
          <CommentThread
            comments={commentsState}
            postAuthorId={post.author_id}
            currentUserId={currentUserId}
            busy={isBusy}
            setReplyTo={setReplyTo}
            onHideComment={(cid, hidden) => void onHideComment(post.id, cid, hidden)}
            onDeleteComment={(cid) => void onDeleteComment(post.id, cid)}
          />
          <Field
            id={`community-comment-${post.id}`}
            label={replyTo ? "Reply to thread" : "Add a comment"}
            className="mt-mca-sm"
          >
            <textarea
              id={`community-comment-${post.id}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={4000}
              className="mca-input mt-mca-sm resize-y text-sm text-mca-body"
            />
          </Field>
          {replyTo ? (
            <button
              type="button"
              className="text-mca-caption text-mca-accent-strong"
              onClick={() => setReplyTo(null)}
            >
              Cancel reply
            </button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy || !draft.trim()}
            onClick={() => {
              const t = draft.trim();
              if (!t) return;
              setDraft("");
              onSubmitComment(post.id, t, replyTo);
              setReplyTo(null);
            }}
          >
            {replyTo ? "Reply" : "Comment"}
          </Button>
        </div>
      ) : null}
    </Panel>
  );
});
