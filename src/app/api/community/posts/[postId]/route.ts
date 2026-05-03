import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import type { CommunityPostDTO } from "@/lib/dto/catalog";
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
  const ctx = withContextId();
  const postId = context.params.postId?.trim();
  if (!postId || !isUuidString(postId)) {
    return errorJson(ctx, "Invalid post id", 400);
  }

  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { body?: string } = {};
  try {
    body = (await request.json()) as { body?: string };
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text) {
    return errorJson(ctx, "body required", 400);
  }
  if (text.length > MAX_BODY) {
    return errorJson(ctx, `body too long (max ${MAX_BODY})`, 400);
  }

  const { data, error } = await supabase
    .from("community_posts")
    .update({ body: text, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("author_id", session.userId)
    .select("id, body, created_at, updated_at, author_id")
    .maybeSingle();

  if (error) {
    return errorJson(ctx, error.message, 500);
  }
  if (!data) {
    return errorJson(ctx, "Not found", 404);
  }

  return NextResponse.json({ success: true, context_id: ctx.contextId, post: data as CommunityPostDTO });
}

async function DELETE_handler(
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

  const { data: deleted, error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", session.userId)
    .select("id");

  if (error) {
    return errorJson(ctx, error.message, 500);
  }
  if (!deleted?.length) {
    return errorJson(ctx, "Not found", 404);
  }

  return NextResponse.json({ success: true, context_id: ctx.contextId, ok: true });
}

export const PATCH = defineRoute("PATCH /api/community/posts/[postId]", PATCH_handler);
export const DELETE = defineRoute("DELETE /api/community/posts/[postId]", DELETE_handler);
