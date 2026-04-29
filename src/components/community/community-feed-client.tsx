"use client";

import { InlineUserBadges } from "@/components/badges/inline-user-badges";
import { InlineUserFlair } from "@/components/flair/inline-user-flair";
import { TrainerPresenceDot } from "@/components/presence/trainer-presence-dot";
import { InlineSeasonalEvent } from "@/components/seasonal/inline-seasonal-event";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import {
  enqueueOfflineAction,
  finalizeOfflineAction,
  isLikelyOfflineError,
  listOfflineActions,
} from "@/lib/mobile/offline-action-queue";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { buildInlineIdentityProgressTitle } from "@/lib/social/inline-identity-tooltip";
import type { SocialPresenceSnapshot } from "@/lib/social/types";
import { useCallback, useEffect, useState } from "react";

type FeedPost = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_display: string;
  author_avatar_url: string | null;
  author_tier_slug?: string | null;
  author_top_scan_milestone?: string | null;
  author_reputation_score?: number;
  author_activity_streak?: number;
  author_top_flair_key?: string | null;
  author_top_seasonal_flair_key?: string | null;
  author_top_seasonal_badge_key?: string | null;
  author_seasonal_badge_keys?: string[];
  author_top_journey_badge_key?: string | null;
  author_journey_progress_summary?: string | null;
  author_top_collection_mastery_badge_key?: string | null;
  author_collection_mastery_summary?: string | null;
  author_trade_reputation_score_summary?: string | null;
  author_top_trade_badge_key?: string | null;
  author_favorite_format_id?: string | null;
  author_favorite_archetype_id?: string | null;
  author_favorite_deck_name?: string | null;
  author_top_play_badge_key?: string | null;
  author_secondary_play_flair_key?: string | null;
  author_value_identity_summary?: string | null;
  author_rarity_profile_label?: string | null;
  author_top_value_badge_key?: string | null;
  author_grail_highlight_summary?: string | null;
  author_top_fandom_badge_key?: string | null;
  author_fandom_summary?: string | null;
  author_persona_text?: string | null;
  author_clubs_summary?: string | null;
  author_reputation_summary?: string | null;
  author_influence_summary?: string | null;
  author_presence?: SocialPresenceSnapshot;
  like_count: number;
  comment_count: number;
  liked_by_viewer: boolean;
  reaction_counts?: Record<string, number>;
  viewer_reactions?: string[];
};

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  author_display: string;
  author_avatar_url: string | null;
  author_tier_slug?: string | null;
  author_top_scan_milestone?: string | null;
  author_reputation_score?: number;
  author_activity_streak?: number;
  author_top_flair_key?: string | null;
  author_top_seasonal_flair_key?: string | null;
  author_top_seasonal_badge_key?: string | null;
  author_seasonal_badge_keys?: string[];
  author_top_journey_badge_key?: string | null;
  author_journey_progress_summary?: string | null;
  author_top_collection_mastery_badge_key?: string | null;
  author_collection_mastery_summary?: string | null;
  author_trade_reputation_score_summary?: string | null;
  author_top_trade_badge_key?: string | null;
  author_favorite_format_id?: string | null;
  author_favorite_archetype_id?: string | null;
  author_favorite_deck_name?: string | null;
  author_top_play_badge_key?: string | null;
  author_secondary_play_flair_key?: string | null;
  author_value_identity_summary?: string | null;
  author_rarity_profile_label?: string | null;
  author_top_value_badge_key?: string | null;
  author_grail_highlight_summary?: string | null;
  author_top_fandom_badge_key?: string | null;
  author_fandom_summary?: string | null;
  author_persona_text?: string | null;
  author_clubs_summary?: string | null;
  author_reputation_summary?: string | null;
  author_influence_summary?: string | null;
  author_presence?: SocialPresenceSnapshot;
  parent_comment_id?: string | null;
  hidden?: boolean;
};

const REACTIONS = ["👍", "❤️", "🔥", "😂", "🎉"] as const;

export function CommunityFeedClient({ currentUserId }: { currentUserId: string }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [composer, setComposer] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, CommentRow[] | "loading" | undefined>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/community/posts", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as {
        posts?: FeedPost[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Failed to load feed");
      setPosts(Array.isArray(body.posts) ? body.posts : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const flush = async () => {
      const pending = listOfflineActions().filter((a) => a.kind === "community_post_draft");
      for (const p of pending) {
        if (p.kind !== "community_post_draft") continue;
        try {
          const res = await fetch("/api/community/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: p.body }),
          });
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          if (res.ok) {
            finalizeOfflineAction(p.id, "synced");
            mcaLog.event(
              "mobile.offline.queue",
              { kind: "community_post_draft", op: "flush_ok", id: p.id },
              { componentName: "CommunityFeedClient", surfaceName: "mobile" }
            );
            await load();
          } else if (body.error) {
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
  }, [load]);

  const onPost = useCallback(async () => {
    const text = composer.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not post");
      setComposer("");
      await load();
    } catch (e) {
      if (isLikelyOfflineError(e)) {
        enqueueOfflineAction({ kind: "community_post_draft", body: text });
        setError("Offline — post queued to send when you are back online.");
        mcaLog.event(
          "mobile.offline.queue",
          { kind: "community_post_draft", op: "enqueue" },
          { componentName: "CommunityFeedClient", surfaceName: "mobile" }
        );
      } else {
        setError(e instanceof Error ? e.message : "Could not post");
      }
    } finally {
      setBusy(false);
    }
  }, [composer, load]);

  const onToggleLike = useCallback(
    async (postId: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/like`, {
          method: "POST",
        });
        const body = (await res.json().catch(() => ({}))) as {
          liked?: boolean;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? "Could not update like");
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const liked = Boolean(body.liked);
            const delta = liked ? 1 : -1;
            return {
              ...p,
              liked_by_viewer: liked,
              like_count: Math.max(0, p.like_count + delta),
            };
          })
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update like");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const loadComments = useCallback(async (postId: string) => {
    setExpanded((e) => ({ ...e, [postId]: "loading" }));
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as {
        comments?: CommentRow[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? "Could not load comments");
      setExpanded((e) => ({ ...e, [postId]: body.comments ?? [] }));
    } catch {
      setExpanded((e) => ({ ...e, [postId]: [] }));
    }
  }, []);

  const onComment = useCallback(
    async (postId: string, text: string, parentCommentId?: string | null) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: text,
            parent_comment_id: parentCommentId ?? null,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not comment");
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p
          )
        );
        await loadComments(postId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not comment");
      } finally {
        setBusy(false);
      }
    },
    [loadComments]
  );

  const onToggleReaction = useCallback(async (postId: string, reaction: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/community/posts/${encodeURIComponent(postId)}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not react");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not react");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const onHideComment = useCallback(
    async (postId: string, commentId: string, hidden: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/hide`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hidden }),
          }
        );
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not update comment");
        await loadComments(postId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not update comment");
      } finally {
        setBusy(false);
      }
    },
    [loadComments]
  );

  if (loading) {
    return <p className="text-mca-body text-mca-ink-muted">Loading community…</p>;
  }

  return (
    <div className="touch-manipulation space-y-mca-xl">
      {error ? (
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {error}
        </p>
      ) : null}

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
            className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm text-sm text-mca-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
          />
        </Field>
        <div className="mt-mca-md flex justify-end">
          <Button type="button" disabled={busy || !composer.trim()} onClick={() => void onPost()}>
            Post
          </Button>
        </div>
      </Panel>

      <div className="space-y-mca-md">
        {posts.length === 0 ? (
          <p className="text-mca-caption text-mca-ink-subtle">No posts yet — be the first.</p>
        ) : (
          posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              currentUserId={currentUserId}
              busy={busy}
              commentsState={expanded[p.id]}
              onToggleReaction={(reaction) => void onToggleReaction(p.id, reaction)}
              onToggleLike={() => void onToggleLike(p.id)}
              onToggleComments={() => {
                if (expanded[p.id] && expanded[p.id] !== "loading") {
                  setExpanded((e) => {
                    const next = { ...e };
                    delete next[p.id];
                    return next;
                  });
                } else {
                  void loadComments(p.id);
                }
              }}
              onSubmitComment={(text, parentId) => void onComment(p.id, text, parentId)}
              onHideComment={(commentId, hidden) => void onHideComment(p.id, commentId, hidden)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CommentThread({
  comments,
  postAuthorId,
  currentUserId,
  busy,
  setReplyTo,
  onHideComment,
}: {
  comments: CommentRow[];
  postAuthorId: string;
  currentUserId: string;
  busy: boolean;
  setReplyTo: (id: string | null) => void;
  onHideComment: (commentId: string, hidden: boolean) => void;
}) {
  const roots = comments.filter((c) => !c.parent_comment_id);
  const children: Record<string, CommentRow[]> = {};
  for (const c of comments) {
    const pid = c.parent_comment_id;
    if (pid) {
      if (!children[pid]) children[pid] = [];
      children[pid].push(c);
    }
  }

  const renderOne = (c: CommentRow, depth: number) => {
    const isPostOwner = postAuthorId === currentUserId;
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
                className="mt-0.5"
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
              className="text-xs"
              disabled={busy}
              onClick={() => setReplyTo(c.id)}
            >
              Reply
            </Button>
            {isPostOwner ? (
              <Button
                type="button"
                variant="tertiary"
                className="text-xs text-mca-error-accent"
                disabled={busy}
                onClick={() => onHideComment(c.id, c.hidden !== true)}
              >
                {c.hidden === true ? "Unhide" : "Hide"}
              </Button>
            ) : null}
          </div>
        </div>
        <p className="mt-mca-trace whitespace-pre-wrap text-mca-caption text-mca-ink-body">{c.body}</p>
        {(children[c.id] ?? []).map((ch) => renderOne(ch, depth + 1))}
      </div>
    );
  };

  return (
    <>
      {roots.length === 0 ? (
        <p className="text-mca-caption text-mca-ink-subtle">No comments yet.</p>
      ) : (
        roots.map((c) => renderOne(c, 0))
      )}
    </>
  );
}

function PostCard({
  post,
  currentUserId,
  busy,
  commentsState,
  onToggleReaction,
  onToggleLike,
  onToggleComments,
  onSubmitComment,
  onHideComment,
}: {
  post: FeedPost;
  currentUserId: string;
  busy: boolean;
  commentsState: CommentRow[] | "loading" | undefined;
  onToggleReaction: (reaction: string) => void;
  onToggleLike: () => void;
  onToggleComments: () => void;
  onSubmitComment: (text: string, parentCommentId?: string | null) => void;
  onHideComment: (commentId: string, hidden: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const isOwn = post.author_id === currentUserId;
  const counts = post.reaction_counts ?? {};
  const mine = new Set(post.viewer_reactions ?? []);

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
              className="mt-0.5"
            />
          ) : null}
          <span className="truncate">{post.author_display}</span>
        </p>
        <time className="shrink-0 text-mca-caption text-mca-ink-muted" dateTime={post.created_at}>
          {new Date(post.created_at).toLocaleString()}
        </time>
      </div>
      <p className="mt-mca-sm whitespace-pre-wrap text-mca-body text-mca-ink-body">{post.body}</p>
      <div className="mt-mca-md flex flex-wrap gap-mca-xs">
        {REACTIONS.map((em) => {
          const n = counts[em] ?? 0;
          const active = mine.has(em);
          return (
            <button
              key={em}
              type="button"
              disabled={busy}
              onClick={() => onToggleReaction(em)}
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
          disabled={busy}
          onClick={onToggleLike}
          className="text-xs"
        >
          {post.liked_by_viewer ? "♥ Liked" : "♡ Like"} · {post.like_count}
        </Button>
        <Button type="button" variant="tertiary" disabled={busy} onClick={onToggleComments} className="text-xs">
          Comments · {post.comment_count}
        </Button>
        {isOwn ? (
          <span className="text-mca-caption text-mca-ink-muted">Your post</span>
        ) : null}
      </div>

      {commentsState === "loading" ? (
        <p className="mt-mca-md text-mca-caption text-mca-ink-muted">Loading comments…</p>
      ) : Array.isArray(commentsState) ? (
        <div className="mt-mca-md space-y-mca-sm border-t border-mca-border/80 pt-mca-md">
          <CommentThread
            comments={commentsState}
            postAuthorId={post.author_id}
            currentUserId={currentUserId}
            busy={busy}
            setReplyTo={setReplyTo}
            onHideComment={onHideComment}
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
              className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm text-sm text-mca-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
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
            disabled={busy || !draft.trim()}
            onClick={() => {
              const t = draft.trim();
              if (!t) return;
              setDraft("");
              onSubmitComment(t, replyTo);
              setReplyTo(null);
            }}
          >
            {replyTo ? "Reply" : "Comment"}
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
