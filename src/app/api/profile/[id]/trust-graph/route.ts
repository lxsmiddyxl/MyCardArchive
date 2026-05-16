import { errorJson, withContextId } from "@/lib/api/route-helpers";
import { compositeReputation01 } from "@/lib/reputation/composite-score";
import { trustScoreV4 } from "@/lib/reputation/reputation-v4";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const profileId = context.params.id?.trim();
  if (!profileId || !isUuidString(profileId)) {
    return errorJson(ctx, "Invalid profile id", 400);
  }

  const supabase = createClient();

  const [repRes, followOut, followIn, tradesRes, postsRes] = await Promise.all([
    supabase.rpc("get_users_reputation_graph_batch", { p_user_ids: [profileId] }),
    supabase.from("user_follows").select("following_id").eq("follower_id", profileId).limit(200),
    supabase.from("user_follows").select("follower_id").eq("following_id", profileId).limit(200),
    supabase
      .from("trades")
      .select("status")
      .or(`initiator_id.eq.${profileId},recipient_id.eq.${profileId}`)
      .limit(500),
    supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("author_id", profileId),
  ]);

  const repRow = (repRes.data ?? [])[0] as {
    helpfulness_score: number;
    expertise_score: number;
    positivity_score: number;
    reliability_score: number;
    contribution_score: number;
  } | undefined;

  const trades = tradesRes.data ?? [];
  const completed = trades.filter((t) => t.status === "completed").length;

  const graph = trustScoreV4({
    userId: profileId,
    graph: repRow
      ? {
          helpfulness_score: repRow.helpfulness_score,
          expertise_score: repRow.expertise_score,
          positivity_score: repRow.positivity_score,
          reliability_score: repRow.reliability_score,
          contribution_score: repRow.contribution_score,
        }
      : null,
    trades_completed: completed,
    trades_total: trades.length,
    community_posts: postsRes.count ?? 0,
    report_count_bucket: 0,
    followingIds: (followOut.data ?? []).map((r) => r.following_id).filter(Boolean),
    followerIds: (followIn.data ?? []).map((r) => r.follower_id).filter(Boolean),
  });

  return NextResponse.json({
    success: true,
    context_id: ctx.contextId,
    trustGraph: graph,
    compositeReputation: repRow ? compositeReputation01(repRow) : null,
  });
}

export const GET = defineRoute("GET /api/profile/[id]/trust-graph", GET_handler);
