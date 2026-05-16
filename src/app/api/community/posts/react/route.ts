import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { rateLimitedResponse } from "@/lib/server/rate-limit-api";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/posts/react", surfaceName: "community" } as const;
const ALLOWED = new Set(["👍", "❤️", "🔥", "😂", "🎉", "🎴", "⚡", "✨"]);

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const blocked = rateLimitedResponse(request, "community-react-mut", {
    max: 60,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { post_id?: string; reaction?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const postId = body.post_id?.trim();
  const reaction = typeof body.reaction === "string" ? body.reaction.trim() : "";
  if (!postId || !isUuidString(postId)) return errorJson(ctx, "post_id required", 400);
  if (!ALLOWED.has(reaction)) return errorJson(ctx, "Invalid reaction", 400);

  const { data: post } = await supabase.from("community_posts").select("id").eq("id", postId).maybeSingle();
  if (!post) return errorJson(ctx, "Post not found", 404);

  const { data: existing } = await supabase
    .from("community_post_reactions")
    .select("reaction")
    .eq("post_id", postId)
    .eq("user_id", session.userId)
    .eq("reaction", reaction)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("community_post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", session.userId)
      .eq("reaction", reaction);
    if (error) return errorJson(ctx, error.message, 500);
    mcaLog.event("community.v3.react", { postId, reaction, active: false }, CTX);
    return NextResponse.json({ success: true, context_id: ctx.contextId, active: false });
  }

  const { error: insErr } = await supabase.from("community_post_reactions").insert({
    post_id: postId,
    user_id: session.userId,
    reaction,
  });
  if (insErr) return errorJson(ctx, insErr.message, 500);

  mcaLog.event("community.v3.react", { postId, reaction, active: true }, CTX);
  return NextResponse.json({ success: true, context_id: ctx.contextId, active: true });
}

export const POST = defineRouteSimple("POST /api/community/posts/react", POST_handler);
