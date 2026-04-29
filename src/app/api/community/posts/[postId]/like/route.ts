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
  const postId = context.params.postId?.trim();
  if (!postId || !isUuidString(postId)) {
    return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: post } = await supabase.from("community_posts").select("id").eq("id", postId).maybeSingle();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("community_post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("community_post_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    mcaLog.event("community.like", { postId, action: "unlike" }, CTX);
    return NextResponse.json({ liked: false });
  }

  const { error } = await supabase.from("community_post_likes").insert({
    post_id: postId,
    user_id: user.id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("community.like", { postId, action: "like" }, CTX);
  return NextResponse.json({ liked: true });
}

export const POST = defineRoute("POST /api/community/posts/[postId]/like", POST_handler);
