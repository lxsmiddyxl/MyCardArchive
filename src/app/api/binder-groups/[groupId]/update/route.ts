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
  let body: { title?: string; description?: string; cover_url?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const patch: Record<string, string | null> = {};
  if (body.title !== undefined) patch.title = body.title.trim();
  if (body.description !== undefined) patch.description = body.description?.trim() || null;
  if (body.cover_url !== undefined) patch.cover_url = body.cover_url?.trim() || null;

  const { data, error } = await supabase
    .from("binder_groups")
    .update(patch)
    .eq("id", groupId)
    .eq("user_id", session.userId)
    .select("id, title, description, cover_url")
    .maybeSingle();

  if (error || !data) {
    return errorJson(ctx, "Group not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  return successJson(ctx, { group: data });
}

export const POST = defineRoute("POST /api/binder-groups/[groupId]/update", POST_handler);
