import { errorJson, successJson, withContextId } from "@/lib/api/route-helpers";
import { inferBadgeCategoryFromSlug } from "@/lib/reputation/badge-categories";
import { compositeReputation01 } from "@/lib/reputation/composite-score";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler(request: Request, context: { params: Record<string, string> }) {
  const base = withContextId();
  const id = context.params.id?.trim();
  if (!id || !isUuidString(id)) {
    return errorJson(base, "Invalid profile id", 400);
  }

  const supabase = createClient();
  const { data: graphRows, error: gErr } = await supabase.rpc("get_users_reputation_graph_batch", {
    p_user_ids: [id],
  });
  if (gErr) {
    return errorJson(base, gErr.message, 500);
  }
  const row = (graphRows ?? [])[0] as
    | {
        user_id: string;
        helpfulness_score: number;
        expertise_score: number;
        positivity_score: number;
        reliability_score: number;
        contribution_score: number;
      }
    | undefined;

  const { data: ua } = await supabase
    .from("user_achievements")
    .select("achievement_id, achievements(slug)")
    .eq("user_id", id)
    .limit(200);

  const badges = (ua ?? []).map((r) => {
    const ach = r.achievements as { slug?: string } | null;
    const slug = (ach?.slug ?? r.achievement_id) as string;
    return {
      slug,
      category: inferBadgeCategoryFromSlug(slug),
    };
  });

  const score01 = compositeReputation01(
    row
      ? {
          helpfulness_score: row.helpfulness_score,
          expertise_score: row.expertise_score,
          positivity_score: row.positivity_score,
          reliability_score: row.reliability_score,
          contribution_score: row.contribution_score,
        }
      : null
  );

  return successJson(base, {
    user_id: id,
    reputation_score: score01,
    dimensions: row
      ? {
          helpfulness: row.helpfulness_score,
          expertise: row.expertise_score,
          positivity: row.positivity_score,
          reliability: row.reliability_score,
          contribution: row.contribution_score,
        }
      : null,
    badges,
  });
}

export const GET = defineRoute("GET /api/profile/[id]/reputation", GET_handler);
