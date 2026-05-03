import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/posts/comments/hide", surfaceName: "community" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const postId = context.params.postId?.trim();
  const commentId = context.params.commentId?.trim();
  if (!postId || !isUuidString(postId) || !commentId || !isUuidString(commentId)) {
    return errorJson(ctx, "Invalid id", 400);
  }

  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let hidden = true;
  try {
    const b = (await request.json().catch(() => ({}))) as { hidden?: boolean };
    if (typeof b.hidden === "boolean") hidden = b.hidden;
  } catch {
    /* default true */
  }

  const { error } = await supabase.rpc("community_set_comment_hidden", {
    p_comment_id: commentId,
    p_hidden: hidden,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("forbidden")) {
      return errorJson(ctx, "Forbidden", 403);
    }
    if (msg.includes("not found")) {
      return errorJson(ctx, "Not found", 404);
    }
    return errorJson(ctx, error.message, 500);
  }

  mcaLog.event("community.moderation", { postId, commentId, hidden }, CTX);
  return NextResponse.json({ success: true, context_id: ctx.contextId, ok: true, hidden });
}

export const POST = defineRoute("POST /api/community/posts/[postId]/comments/[commentId]/hide", POST_handler);
