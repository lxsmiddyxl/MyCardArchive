import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { unsubscribeFromBinder } from "@/lib/binders/binder-subscriptions";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function POST_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const binderId = params.binderId?.trim() ?? "";
  if (!binderId) {
    return errorJson(ctx, "binderId required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const result = await unsubscribeFromBinder(supabase, session.userId, binderId);
  if (!result.ok) {
    return errorJson(ctx, result.error, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { ok: true, binder_id: binderId });
}

export const POST = defineRoute("POST /api/binders/[binderId]/unsubscribe", POST_handler);
