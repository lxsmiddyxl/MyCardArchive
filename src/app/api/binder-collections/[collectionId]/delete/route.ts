import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
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

  const collectionId = params.collectionId?.trim() ?? "";
  const { error } = await supabase
    .from("binder_collections")
    .delete()
    .eq("id", collectionId)
    .eq("user_id", session.userId);

  if (error) {
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { ok: true });
}

export const POST = defineRoute(
  "POST /api/binder-collections/[collectionId]/delete",
  POST_handler
);
