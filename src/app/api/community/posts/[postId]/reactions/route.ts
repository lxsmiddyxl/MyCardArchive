import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/posts/reactions", surfaceName: "community" } as const;

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["👍", "❤️", "🔥", "😂", "🎉", "🎴", "⚡", "✨"]);

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
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

  const { data: rows, error } = await supabase
    .from("community_post_reactions")
    .select("reaction, user_id")
    .eq("post_id", postId);

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  const counts: Record<string, number> = {};
  const mine = new Set<string>();
  for (const r of rows ?? []) {
    counts[r.reaction] = (counts[r.reaction] ?? 0) + 1;
    if (r.user_id === session.userId) mine.add(r.reaction);
  }

  return NextResponse.json({ success: true, context_id: ctx.contextId, counts, viewerReactions: [...mine] });
}

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const postId = context.params.postId?.trim();
  if (!postId || !isUuidString(postId)) {
    return errorJson(ctx, "Invalid post id", 400);
  }

  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { reaction?: string } = {};
  try {
    body = (await request.json()) as { reaction?: string };
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const reaction = typeof body.reaction === "string" ? body.reaction.trim() : "";
  if (!ALLOWED.has(reaction)) {
    return errorJson(ctx, "Invalid reaction", 400);
  }

  const { data: post } = await supabase.from("community_posts").select("id").eq("id", postId).maybeSingle();
  if (!post) {
    return errorJson(ctx, "Post not found", 404);
  }

  const { data: existing } = await supabase
    .from("community_post_reactions")
    .select("reaction")
    .eq("post_id", postId)
    .eq("user_id", session.userId)
    .eq("reaction", reaction)
    .maybeSingle();

  if (existing) {
    const { error: delErr } = await supabase
      .from("community_post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", session.userId)
      .eq("reaction", reaction);
    if (delErr) {
      return errorJson(ctx, delErr.message, 500);
    }
    mcaLog.event("community.reaction", { postId, reaction, active: false }, CTX);
    return NextResponse.json({ success: true, context_id: ctx.contextId, active: false });
  }

  const { error: insErr } = await supabase.from("community_post_reactions").insert({
    post_id: postId,
    user_id: session.userId,
    reaction,
  });
  if (insErr) {
    return errorJson(ctx, insErr.message, 500);
  }

  mcaLog.event("community.reaction", { postId, reaction, active: true }, CTX);
  return NextResponse.json({ success: true, context_id: ctx.contextId, active: true });
}

export const GET = defineRoute("GET /api/community/posts/[postId]/reactions", GET_handler);
export const POST = defineRoute("POST /api/community/posts/[postId]/reactions", POST_handler);
