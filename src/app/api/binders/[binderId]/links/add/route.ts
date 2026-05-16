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

  const { ctx, supabase, userId, binderId } = resolved.session;

  let body: { target_binder_id?: string; label?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const targetBinderId = body.target_binder_id?.trim() ?? "";
  const label = body.label?.trim() ?? "";
  if (!targetBinderId || !label) {
    return errorJson(ctx, "target_binder_id and label required", 400, {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }
  if (targetBinderId === binderId) {
    return errorJson(ctx, "Cannot link to self", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data: target } = await supabase
    .from("binders")
    .select("id")
    .eq("id", targetBinderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!target) {
    return errorJson(ctx, "Target binder not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  const { data, error } = await supabase
    .from("binder_links")
    .insert({ binder_id: binderId, target_binder_id: targetBinderId, label })
    .select("id, binder_id, target_binder_id, label, created_at")
    .single();

  if (error) {
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { link: data });
}

export const POST = defineRoute("POST /api/binders/[binderId]/links/add", POST_handler);
