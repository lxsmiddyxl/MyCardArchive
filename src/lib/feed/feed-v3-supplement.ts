import type { FeedItemForRank } from "@/lib/feed/hybrid-rank";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

function epoch(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t / 1000 : 0;
}

function syntheticId(kind: string, sourceId: string): string {
  return `mca-feed-v3-${kind}-${sourceId}`;
}

function baseSignals(createdAt: string, extras: Partial<NonNullable<FeedItemForRank["signals"]>> = {}) {
  return {
    recency_epoch: epoch(createdAt),
    mutual: 0,
    engagement: 1200,
    shared_sets: 0,
    marketplace_overlap: 0,
    ml_assist: 0.02,
    identity_alignment: 0,
    presence_proximity: 0,
    cluster_fusion: 0,
    ...extras,
  };
}

export type FeedV3SupplementInput = {
  followingIds: string[];
  mutualIds: string[];
};

export async function loadFeedV3SupplementRows(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  opts: FeedV3SupplementInput
): Promise<FeedItemForRank[]> {
  const mutualSet = new Set(opts.mutualIds);
  const followingSlice = opts.followingIds.slice(0, 60);

  let showRes: {
    data: {
      id: string;
      user_id: string;
      title: string;
      updated_at: string;
      analytics_views: number | null;
    }[];
  } = { data: [] };
  if (followingSlice.length > 0) {
    showRes = await supabase
      .from("collection_showcases")
      .select("id, user_id, title, updated_at, analytics_views")
      .in("user_id", followingSlice)
      .order("updated_at", { ascending: false })
      .limit(10);
  }

  const [tradeRes, followRes] = await Promise.all([
    supabase
      .from("trades")
      .select("id, status, created_at, created_by, counterparty_id")
      .eq("status", "completed")
      .or(`created_by.eq.${viewerId},counterparty_id.eq.${viewerId}`)
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("user_follows")
      .select("follower_id, following_id, created_at")
      .or(`follower_id.eq.${viewerId},following_id.eq.${viewerId}`)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const out: FeedItemForRank[] = [];

  for (const r of showRes.data ?? []) {
    const id = typeof r.id === "string" ? r.id : "";
    const actor = typeof r.user_id === "string" ? r.user_id : "";
    const updated = typeof r.updated_at === "string" ? r.updated_at : new Date().toISOString();
    const views = typeof r.analytics_views === "number" ? r.analytics_views : 0;
    if (!id || !actor) continue;
    const mutual = mutualSet.has(actor) ? 1 : 0;
    out.push({
      id: syntheticId("showcase_created", id),
      kind: "showcase_created",
      actor_id: actor,
      created_at: updated,
      rank_score: 5e6 + views * 40,
      subject_id: id,
      payload: {
        showcase_id: id,
        title: typeof r.title === "string" ? r.title : "Showcase",
      },
      signals: baseSignals(updated, {
        mutual,
        engagement: 900 + Math.min(4000, views * 12),
        identity_alignment: mutual ? 120 : 40,
      }),
    });
  }

  for (const r of tradeRes.data ?? []) {
    const id = typeof r.id === "string" ? r.id : "";
    const created = typeof r.created_at === "string" ? r.created_at : new Date().toISOString();
    const createdBy = typeof r.created_by === "string" ? r.created_by : "";
    if (!id || !createdBy) continue;
    const mutual = mutualSet.has(createdBy) ? 1 : 0;
    out.push({
      id: syntheticId("trade_completed", id),
      kind: "trade_completed",
      actor_id: createdBy,
      created_at: created,
      rank_score: 6e6,
      subject_id: id,
      payload: { trade_id: id },
      signals: baseSignals(created, {
        mutual,
        engagement: 4200 + mutual * 800,
        marketplace_overlap: mutual ? 80 : 20,
      }),
    });
  }

  for (const r of followRes.data ?? []) {
    const follower = typeof r.follower_id === "string" ? r.follower_id : "";
    const following = typeof r.following_id === "string" ? r.following_id : "";
    const created = typeof r.created_at === "string" ? r.created_at : new Date().toISOString();
    if (!follower || !following) continue;
    const actor = follower === viewerId ? following : follower;
    const mutual = mutualSet.has(actor) ? 1 : 0;
    const edgeKey = `${follower}->${following}`;
    out.push({
      id: syntheticId("follow_edge_created", edgeKey),
      kind: "follow_edge_created",
      actor_id: actor,
      created_at: created,
      rank_score: 4e6,
      subject_id: follower,
      payload: { follower_id: follower, following_id: following },
      signals: baseSignals(created, { mutual, engagement: 2600 + mutual * 500 }),
    });
  }

  return out;
}
