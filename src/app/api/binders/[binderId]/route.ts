import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import type { BinderSummaryDTO } from "@/lib/dto/catalog";
import { createClient } from "@/lib/supabase/server";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  try {
    const supabase = createClient();
    const session = await validateSession(supabase, ctx);
    if (!session.ok) return session.response;

    const id = context.params["binderId"]?.trim();
    if (!id) {
      return errorJson(ctx, "Invalid binder id", 400);
    }

    const { data, error } = await supabase
      .from("binders")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.userId)
      .maybeSingle();

    if (error) {
      return errorJson(ctx, error.message, 500);
    }

    if (!data) {
      return errorJson(ctx, "Not found", 404);
    }

    return NextResponse.json({ success: true, context_id: ctx.contextId, binder: data as BinderSummaryDTO });
  } catch {
    return errorJson(ctx, "Server error", 500);
  }
}

async function PATCH_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  try {
    const supabase = createClient();
    const session = await validateSession(supabase, ctx);
    if (!session.ok) return session.response;

    const id = context.params["binderId"]?.trim();
    if (!id) {
      return errorJson(ctx, "Invalid binder id", 400);
    }

    let body: { name?: string; description?: string | null };
    try {
      body = await request.json();
    } catch {
      return errorJson(ctx, "Invalid JSON", 400);
    }

    const patch: { name?: string; description?: string | null } = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (!trimmed) {
        return errorJson(ctx, "name cannot be empty", 400);
      }
      patch.name = trimmed;
    }

    if (typeof body.description === "string") {
      patch.description = body.description.trim() || null;
    } else if (body.description === null) {
      patch.description = null;
    }

    if (Object.keys(patch).length === 0) {
      return errorJson(ctx, "No valid fields to update", 400);
    }

    const { data, error } = await supabase
      .from("binders")
      .update(patch)
      .eq("id", id)
      .eq("user_id", session.userId)
      .select("*")
      .maybeSingle();

    if (error) {
      return errorJson(ctx, error.message, 500);
    }

    if (!data) {
      return errorJson(ctx, "Not found", 404);
    }

    return NextResponse.json({ success: true, context_id: ctx.contextId, binder: data as BinderSummaryDTO });
  } catch {
    return errorJson(ctx, "Server error", 500);
  }
}

async function DELETE_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  try {
    const supabase = createClient();
    const session = await validateSession(supabase, ctx);
    if (!session.ok) return session.response;

    const id = context.params["binderId"]?.trim();
    if (!id) {
      return errorJson(ctx, "Invalid binder id", 400);
    }

    const { data, error } = await supabase
      .from("binders")
      .delete()
      .eq("id", id)
      .eq("user_id", session.userId)
      .select("id")
      .maybeSingle();

    if (error) {
      return errorJson(ctx, error.message, 500);
    }

    if (!data) {
      return errorJson(ctx, "Not found", 404);
    }

    return NextResponse.json({ success: true, context_id: ctx.contextId, ok: true });
  } catch {
    return errorJson(ctx, "Server error", 500);
  }
}

export const GET = defineRoute("GET /api/binders/[binderId]", GET_handler);
export const PATCH = defineRoute("PATCH /api/binders/[binderId]", PATCH_handler);
export const DELETE = defineRoute("DELETE /api/binders/[binderId]", DELETE_handler);
