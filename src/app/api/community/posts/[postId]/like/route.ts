import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/posts/like", surfaceName: "community" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const postId = context.params.postId?.trim();
  if (!postId || !isUuidString(postId)) {
    return errorJson(ctx, "Invalid post id", 400);
  }

  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: post } = await supabase.from("community_posts").select("id").eq("id", postId).maybeSingle();
  if (!post) {
    return errorJson(ctx, "Post not found", 404);
  }

  const { data: existing } = await supabase
    .from("community_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("community_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", session.userId);
    if (error) {
      return errorJson(ctx, error.message, 500);
    }
    mcaLog.event("community.like", { postId, action: "unlike" }, CTX);
    return NextResponse.json({ success: true, context_id: ctx.contextId, liked: false });
  }

  const { error } = await supabase.from("community_post_likes").insert({
    post_id: postId,
    user_id: session.userId,
  });
  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  mcaLog.event("community.like", { postId, action: "like" }, CTX);
  return NextResponse.json({ success: true, context_id: ctx.contextId, liked: true });
}

export const POST = defineRoute("POST /api/community/posts/[postId]/like", POST_handler);
