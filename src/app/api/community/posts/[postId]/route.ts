import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const MAX_BODY = 8000;

export const dynamic = "force-dynamic";

async function PATCH_handler(
  request: Request,
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

  let body: { body?: string } = {};
  try {
    body = (await request.json()) as { body?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "body required" }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: `body too long (max ${MAX_BODY})` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("community_posts")
    .update({ body: text, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("author_id", user.id)
    .select("id, body, created_at, updated_at, author_id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ post: data });
}

async function DELETE_handler(
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

  const { data: deleted, error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!deleted?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export const PATCH = defineRoute("PATCH /api/community/posts/[postId]", PATCH_handler);
export const DELETE = defineRoute("DELETE /api/community/posts/[postId]", DELETE_handler);
