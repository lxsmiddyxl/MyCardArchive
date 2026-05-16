import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const id = body.id?.trim() ?? "";
  if (!id) {
    return errorJson(ctx, "id required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { error } = await supabase
    .from("profile_showcase_items")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId);

  if (error) {
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { ok: true });
}

export const POST = defineRouteSimple("POST /api/profile/showcase/remove", POST_handler);
