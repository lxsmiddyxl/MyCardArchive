import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import { isBinderShareable, parseBinderVisibility } from "@/lib/binders/binder-social-types";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

const ALLOWED = new Set(["👍", "❤️", "🔥", "😂", "🎉", "🎴", "⚡", "✨"]);

async function GET_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const binderId = params.binderId?.trim() ?? "";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ctx = { contextId: "binder-reactions", startedAt: Date.now() } as const;

  const { data: binder } = await supabase
    .from("binders")
    .select("id, user_id, visibility")
    .eq("id", binderId)
    .maybeSingle();

  if (!binder) {
    return errorJson(ctx, "Binder not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  const visibility = parseBinderVisibility(binder.visibility);
  const isOwner = Boolean(user?.id && user.id === binder.user_id);
  if (!isOwner && !isBinderShareable(visibility)) {
    return errorJson(ctx, "Forbidden", 403, { code: ApiErrorCode.FORBIDDEN });
  }

  const { data: rows, error } = await supabase
    .from("binder_reactions")
    .select("emoji, user_id")
    .eq("binder_id", binderId);

  if (error) {
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  const counts: Record<string, number> = {};
  const viewerReactions: string[] = [];
  for (const r of rows ?? []) {
    counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
    if (user?.id && r.user_id === user.id) viewerReactions.push(r.emoji);
  }

  return successJson(ctx, { counts, viewerReactions });
}

export const GET = defineRoute("GET /api/binders/[binderId]/reactions", GET_handler);
