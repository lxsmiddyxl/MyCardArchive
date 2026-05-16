import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { sanitizeShowcaseLongForm } from "@/lib/showcases/showcase-long-form";
import { defineRoute } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(_request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const id = context.params.id?.trim();
  if (!id || !isUuidString(id)) return errorJson(ctx, "Invalid showcase id", 400);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("collection_showcases")
    .select("id, title, description, long_form_body, user_id")
    .eq("id", id)
    .maybeSingle();

  if (error) return errorJson(ctx, error.message, 500);
  if (!data) return errorJson(ctx, "Not found", 404);

  return NextResponse.json({
    success: true,
    context_id: ctx.contextId,
    showcase: {
      id: data.id,
      title: data.title,
      description: data.description,
      longFormBody: data.long_form_body,
    },
  });
}

async function PATCH_handler(request: Request, context: { params: Record<string, string> }) {
  const ctx = withContextId();
  const id = context.params.id?.trim();
  if (!id || !isUuidString(id)) return errorJson(ctx, "Invalid showcase id", 400);

  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: existing } = await supabase
    .from("collection_showcases")
    .select("id, user_id, title, description, long_form_body")
    .eq("id", id)
    .maybeSingle();

  if (!existing) return errorJson(ctx, "Not found", 404);
  if (existing.user_id !== session.userId) return errorJson(ctx, "Forbidden", 403);

  let body: { long_form_body?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const longForm = sanitizeShowcaseLongForm(typeof body.long_form_body === "string" ? body.long_form_body : "");

  const { data: updated, error } = await supabase
    .from("collection_showcases")
    .update({ long_form_body: longForm || null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, title, description, long_form_body")
    .single();

  if (error) return errorJson(ctx, error.message, 500);

  const { data: maxSeq } = await supabase
    .from("showcase_version_snapshots")
    .select("seq")
    .eq("showcase_id", id)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSeq = (maxSeq?.seq ?? 0) + 1;
  await supabase.from("showcase_version_snapshots").insert({
    showcase_id: id,
    seq: nextSeq,
    title: updated.title,
    description: updated.description,
    long_form_body: updated.long_form_body,
    actor_id: session.userId,
  });

  return NextResponse.json({
    success: true,
    context_id: ctx.contextId,
    showcase: {
      id: updated.id,
      longFormBody: updated.long_form_body,
    },
  });
}

export const GET = defineRoute("GET /api/showcases/[id]/long-form", GET_handler);
export const PATCH = defineRoute("PATCH /api/showcases/[id]/long-form", PATCH_handler);
