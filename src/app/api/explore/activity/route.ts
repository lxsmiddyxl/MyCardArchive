import { milestoneLabel, dedupeExploreActivity, type ExploreActivityItem } from "@/lib/explore/binder-activity-feed";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { successJson, withContextId } from "@/lib/api/route-helpers";
import { createClient } from "@/lib/supabase/route";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const items: ExploreActivityItem[] = [];

  const { data: recentFollows } = await supabase
    .from("user_follows")
    .select("follower_id, following_id, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  const { data: publicBinders } = await supabase
    .from("binders")
    .select("id, name, user_id, created_at")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(12);

  const { data: comments } = await supabase
    .from("binder_comments")
    .select("id, binder_id, user_id, text, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  const { data: reactions } = await supabase
    .from("binder_reactions")
    .select("id, binder_id, user_id, emoji, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  const { data: activity } = await supabase
    .from("binder_activity")
    .select("id, binder_id, user_id, type, payload, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const profileIds = new Set<string>();
  for (const f of recentFollows ?? []) {
    profileIds.add(f.follower_id);
    profileIds.add(f.following_id);
  }
  for (const b of publicBinders ?? []) profileIds.add(b.user_id);
  for (const c of comments ?? []) profileIds.add(c.user_id);
  for (const r of reactions ?? []) profileIds.add(r.user_id);
  for (const a of activity ?? []) profileIds.add(a.user_id);

  const { data: profiles } = profileIds.size
    ? await supabase
        .from("social_public_profiles")
        .select("user_id, display_name, handle, username")
        .in("user_id", [...profileIds])
    : { data: [] };

  const nameOf = (id: string) => {
    const p = (profiles ?? []).find((x) => x.user_id === id);
    return p?.display_name?.trim() || (p?.handle ? `@${p.handle}` : p?.username) || "Collector";
  };

  for (const f of recentFollows ?? []) {
    items.push({
      id: `follow-${f.follower_id}-${f.following_id}-${f.created_at}`,
      kind: "new_follower",
      label: `${nameOf(f.follower_id)} followed ${nameOf(f.following_id)}`,
      href: null,
      created_at: f.created_at,
    });
  }

  for (const b of publicBinders ?? []) {
    items.push({
      id: `binder-${b.id}`,
      kind: "new_public_binder",
      label: `${nameOf(b.user_id)} shared binder ${b.name}`,
      href: `/b/${b.id}`,
      created_at: b.created_at,
    });
  }

  for (const c of comments ?? []) {
    const preview = c.text.length > 60 ? `${c.text.slice(0, 57)}…` : c.text;
    items.push({
      id: `comment-${c.id}`,
      kind: "binder_comment",
      label: `${nameOf(c.user_id)} commented: ${preview}`,
      href: `/b/${c.binder_id}`,
      created_at: c.created_at,
    });
  }

  for (const r of reactions ?? []) {
    items.push({
      id: `reaction-${r.id}`,
      kind: "binder_reaction",
      label: `${nameOf(r.user_id)} reacted ${r.emoji}`,
      href: `/b/${r.binder_id}`,
      created_at: r.created_at,
    });
  }

  for (const a of activity ?? []) {
    const payload =
      a.payload && typeof a.payload === "object" && !Array.isArray(a.payload)
        ? (a.payload as Record<string, unknown>)
        : {};
    if (a.type === "visibility_changed") {
      items.push({
        id: `activity-${a.id}`,
        kind: "visibility_changed",
        label: `${nameOf(a.user_id)} changed binder visibility`,
        href: `/b/${a.binder_id}`,
        created_at: a.created_at,
      });
    }
    const pct = typeof payload.completion_percent === "number" ? payload.completion_percent : null;
    if (pct != null) {
      const label = milestoneLabel(pct);
      if (label) {
        items.push({
          id: `milestone-${a.id}`,
          kind: "binder_milestone",
          label: `${nameOf(a.user_id)} hit ${label}`,
          href: `/b/${a.binder_id}`,
          created_at: a.created_at,
          meta: { percent: pct },
        });
      }
    }
  }

  const followerCounts = new Map<string, number>();
  const { data: topFollowed } = await supabase
    .from("user_follows")
    .select("following_id");
  for (const row of topFollowed ?? []) {
    followerCounts.set(row.following_id, (followerCounts.get(row.following_id) ?? 0) + 1);
  }
  const trending = [...followerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  for (const [userId, count] of trending) {
    if (count < 2) continue;
    items.push({
      id: `trending-${userId}`,
      kind: "trending_collector",
      label: `${nameOf(userId)} · ${count} followers`,
      href: null,
      created_at: new Date().toISOString(),
      meta: { followers: count },
    });
  }

  return successJson(ctx, { items: dedupeExploreActivity(items) });
}

export const GET = defineRouteNoArgs("GET /api/explore/activity", GET_handler);
