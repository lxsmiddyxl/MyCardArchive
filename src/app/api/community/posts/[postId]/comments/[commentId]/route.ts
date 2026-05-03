import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/posts/comments/[commentId]", surfaceName: "community" } as const;

export const dynamic = "force-dynamic";

async function DELETE_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const postId = context.params.postId?.trim();
  const commentId = context.params.commentId?.trim();
  if (!postId || !isUuidString(postId) || !commentId || !isUuidString(commentId)) {
    return errorJson(ctx, "Invalid id", 400);
  }

  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: deleted, error } = await supabase
    .from("community_post_comments")
    .delete()
    .eq("id", commentId)
    .eq("post_id", postId)
    .eq("author_id", session.userId)
    .select("id");

  if (error) {
    return errorJson(ctx, error.message, 500);
  }
  if (!deleted?.length) {
    return errorJson(ctx, "Not found", 404);
  }

  mcaLog.event("community.comment.delete", { postId, commentId }, CTX);
  return NextResponse.json({ success: true, context_id: ctx.contextId, ok: true });
}

export const DELETE = defineRoute(
  "DELETE /api/community/posts/[postId]/comments/[commentId]",
  DELETE_handler
);
