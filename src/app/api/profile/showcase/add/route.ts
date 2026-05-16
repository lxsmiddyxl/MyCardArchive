import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { binder_id?: string; group_id?: string; position?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const binderId = body.binder_id?.trim() || null;
  const groupId = body.group_id?.trim() || null;
  if (Boolean(binderId) === Boolean(groupId)) {
    return errorJson(ctx, "Provide binder_id or group_id", 400, {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }

  if (binderId) {
    const { data: binder } = await supabase
      .from("binders")
      .select("id")
      .eq("id", binderId)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!binder) {
      return errorJson(ctx, "Binder not found", 404, { code: ApiErrorCode.NOT_FOUND });
    }
  }

  if (groupId) {
    const { data: group } = await supabase
      .from("binder_groups")
      .select("id")
      .eq("id", groupId)
      .eq("user_id", session.userId)
      .maybeSingle();
    if (!group) {
      return errorJson(ctx, "Group not found", 404, { code: ApiErrorCode.NOT_FOUND });
    }
  }

  const position =
    typeof body.position === "number" && Number.isFinite(body.position)
      ? Math.max(0, Math.floor(body.position))
      : 0;

  const { data, error } = await supabase
    .from("profile_showcase_items")
    .insert({
      user_id: session.userId,
      binder_id: binderId,
      group_id: groupId,
      position,
    })
    .select("id, binder_id, group_id, position")
    .single();

  if (error) {
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { item: data });
}

export const POST = defineRouteSimple("POST /api/profile/showcase/add", POST_handler);
