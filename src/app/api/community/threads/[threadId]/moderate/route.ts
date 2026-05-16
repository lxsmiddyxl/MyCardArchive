import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/threads/moderate", surfaceName: "community" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const threadId = context.params.threadId?.trim();
  if (!threadId || !isUuidString(threadId)) {
    return errorJson(ctx, "Invalid thread id", 400);
  }

  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { action?: string; post_id?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const action = body.action?.trim();
  const postId = body.post_id?.trim();
  if (action !== "hide_post" && action !== "lock_thread") {
    return errorJson(ctx, "action must be hide_post or lock_thread", 400);
  }
  if (!postId || !isUuidString(postId)) {
    return errorJson(ctx, "post_id required", 400);
  }

  const { data: post } = await supabase
    .from("community_posts")
    .select("id, author_id, thread_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return errorJson(ctx, "Post not found", 404);
  if (post.thread_id !== threadId && post.id !== threadId) {
    return errorJson(ctx, "Post not in thread", 400);
  }
  if (post.author_id !== session.userId) {
    return errorJson(ctx, "Only thread author may moderate", 403);
  }

  if (action === "hide_post") {
    const { error } = await supabase.rpc("community_set_comment_hidden", {
      p_comment_id: postId,
      p_hidden: true,
    });
    if (error) return errorJson(ctx, error.message, 500);
  }

  mcaLog.event("community.v3.moderate", { threadId, postId, action }, CTX);
  return NextResponse.json({ success: true, context_id: ctx.contextId, action });
}

export const POST = defineRoute("POST /api/community/threads/[threadId]/moderate", POST_handler);
