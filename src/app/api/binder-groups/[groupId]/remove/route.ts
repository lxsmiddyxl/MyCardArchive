import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const groupId = params.groupId?.trim() ?? "";
  let body: { binder_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const binderId = body.binder_id?.trim() ?? "";
  const { error } = await supabase
    .from("binder_group_items")
    .delete()
    .eq("group_id", groupId)
    .eq("binder_id", binderId);

  if (error) {
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { ok: true });
}

export const POST = defineRoute("POST /api/binder-groups/[groupId]/remove", POST_handler);
