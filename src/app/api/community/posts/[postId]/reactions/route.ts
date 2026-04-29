import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/community/posts/reactions", surfaceName: "community" } as const;

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["👍", "❤️", "🔥", "😂", "🎉"]);

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
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

  const { data: rows, error } = await supabase
    .from("community_post_reactions")
    .select("reaction, user_id")
    .eq("post_id", postId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts: Record<string, number> = {};
  const mine = new Set<string>();
  for (const r of rows ?? []) {
    counts[r.reaction] = (counts[r.reaction] ?? 0) + 1;
    if (r.user_id === user.id) mine.add(r.reaction);
  }

  return NextResponse.json({ counts, viewerReactions: [...mine] });
}

async function POST_handler(request: Request, context: { params: Record<string, string> }) {
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

  let body: { reaction?: string } = {};
  try {
    body = (await request.json()) as { reaction?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reaction = typeof body.reaction === "string" ? body.reaction.trim() : "";
  if (!ALLOWED.has(reaction)) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  const { data: post } = await supabase.from("community_posts").select("id").eq("id", postId).maybeSingle();
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: existing } = await supabase
    .from("community_post_reactions")
    .select("reaction")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .eq("reaction", reaction)
    .maybeSingle();

  if (existing) {
    const { error: delErr } = await supabase
      .from("community_post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .eq("reaction", reaction);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    mcaLog.event("community.reaction", { postId, reaction, active: false }, CTX);
    return NextResponse.json({ active: false });
  }

  const { error: insErr } = await supabase.from("community_post_reactions").insert({
    post_id: postId,
    user_id: user.id,
    reaction,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  mcaLog.event("community.reaction", { postId, reaction, active: true }, CTX);
  return NextResponse.json({ active: true });
}

export const GET = defineRoute("GET /api/community/posts/[postId]/reactions", GET_handler);
export const POST = defineRoute("POST /api/community/posts/[postId]/reactions", POST_handler);
