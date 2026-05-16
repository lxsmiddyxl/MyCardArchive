import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import { defineRoute } from "@/lib/server/api-route";
import {
  getBinderInsights,
  pickBinderDistribution,
} from "@/mca-utils/binders/getBinderInsights";

async function GET_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const resolved = await resolveBinderRouteSession(params.binderId);
  if (!resolved.ok) return resolved.response;

  const { ctx, supabase, userId, binderId } = resolved.session;
  const insights = await getBinderInsights(supabase, binderId, userId);
  if (!insights) {
    return errorJson(ctx, "Binder not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  return successJson(ctx, {
    binder_id: binderId,
    ...pickBinderDistribution(insights),
  });
}

export const GET = defineRoute(
  "GET /api/binders/[binderId]/distribution",
  GET_handler
);
