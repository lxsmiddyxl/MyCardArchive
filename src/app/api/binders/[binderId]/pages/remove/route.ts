import { createClient } from "@/lib/supabase/route";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function POST_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  try {
    const supabase = createClient();
    const session = await validateSession(supabase, ctx);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const binderId = context.params["binderId"]?.trim();
    if (!binderId) {
      return errorJson(ctx, "Invalid binder id", 400);
    }

    const { data: binder, error: bErr } = await supabase
      .from("binders")
      .select("id")
      .eq("id", binderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (bErr) {
      return errorJson(ctx, bErr.message, 500);
    }
    if (!binder) {
      return errorJson(ctx, "Binder not found", 404);
    }

    let body: { page_number?: number };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorJson(ctx, "Invalid JSON", 400);
    }

    const pageNumber =
      typeof body.page_number === "number" && Number.isFinite(body.page_number)
        ? Math.max(0, Math.floor(body.page_number))
        : NaN;

    if (!Number.isFinite(pageNumber)) {
      return errorJson(ctx, "page_number required", 400);
    }

    const { data: distinct } = await supabase
      .from("binder_slots")
      .select("page_number")
      .eq("binder_id", binderId);

    const pageSet = new Set(
      (distinct ?? []).map((r) => r.page_number).filter((n) => typeof n === "number")
    );

    if (!pageSet.has(pageNumber)) {
      return successJson(ctx, {
        ok: true,
        message: "Page had no rows",
        duration_ms: Date.now() - ctx.startedAt,
      });
    }

    if (pageSet.size <= 1) {
      return errorJson(ctx, "Cannot remove the only stored page. Clear slots instead.", 400);
    }

    const { error: delErr } = await supabase
      .from("binder_slots")
      .delete()
      .eq("binder_id", binderId)
      .eq("page_number", pageNumber);

    if (delErr) {
      return errorJson(ctx, delErr.message, 500);
    }

    const { data: toShift } = await supabase
      .from("binder_slots")
      .select("id, page_number")
      .eq("binder_id", binderId)
      .gt("page_number", pageNumber);

    for (const row of toShift ?? []) {
      const { error: uErr } = await supabase
        .from("binder_slots")
        .update({ page_number: row.page_number - 1 })
        .eq("id", row.id);
      if (uErr) {
        return errorJson(ctx, uErr.message, 500);
      }
    }

    return successJson(ctx, { ok: true, duration_ms: Date.now() - ctx.startedAt });
  } catch {
    return errorJson(ctx, "Server error", 500);
  }
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/pages/remove",
  POST_handler
);
