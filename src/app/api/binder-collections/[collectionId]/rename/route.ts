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

  const collectionId = params.collectionId?.trim() ?? "";
  let body: { name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }
  const name = body.name?.trim() ?? "";
  if (!name) {
    return errorJson(ctx, "name required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { data, error } = await supabase
    .from("binder_collections")
    .update({ name })
    .eq("id", collectionId)
    .eq("user_id", session.userId)
    .select("id, name")
    .maybeSingle();

  if (error || !data) {
    return errorJson(ctx, "Collection not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  return successJson(ctx, { collection: data });
}

export const POST = defineRoute(
  "POST /api/binder-collections/[collectionId]/rename",
  POST_handler
);
