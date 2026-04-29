import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/posts/comments/hide", surfaceName: "community" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
  const postId = context.params.postId?.trim();
  const commentId = context.params.commentId?.trim();
  if (!postId || !isUuidString(postId) || !commentId || !isUuidString(commentId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (msg.includes("not found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("community.moderation", { postId, commentId, hidden }, CTX);
  return NextResponse.json({ ok: true, hidden });
}

export const POST = defineRoute("POST /api/community/posts/[postId]/comments/[commentId]/hide", POST_handler);
