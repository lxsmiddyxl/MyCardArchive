import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import { defineRoute } from "@/lib/server/api-route";

async function POST_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const resolved = await resolveBinderRouteSession(params.binderId);
  if (!resolved.ok) return resolved.response;

  const { ctx, supabase, binderId } = resolved.session;

  let body: { link_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const linkId = body.link_id?.trim() ?? "";
  if (!linkId) {
    return errorJson(ctx, "link_id required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { error } = await supabase
    .from("binder_links")
    .delete()
    .eq("id", linkId)
    .eq("binder_id", binderId);

  if (error) {
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { ok: true });
}

export const POST = defineRoute("POST /api/binders/[binderId]/links/remove", POST_handler);
