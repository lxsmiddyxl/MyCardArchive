import { BINDER_PAGE_SWAP_TEMP } from "@/lib/binders/constants";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { createClient } from "@/lib/supabase/route";
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

    let body: { page_a?: number; page_b?: number };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorJson(ctx, "Invalid JSON", 400);
    }

    const a =
      typeof body.page_a === "number" && Number.isFinite(body.page_a)
        ? Math.max(0, Math.floor(body.page_a))
        : NaN;
    const b =
      typeof body.page_b === "number" && Number.isFinite(body.page_b)
        ? Math.max(0, Math.floor(body.page_b))
        : NaN;

    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return errorJson(ctx, "page_a and page_b must be non-negative integers", 400);
    }

    if (a === b) {
      return successJson(ctx, { ok: true, message: "No-op" });
    }

    const { data: maxRow } = await supabase
      .from("binder_slots")
      .select("page_number")
      .eq("binder_id", binderId)
      .order("page_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxSeen =
      typeof maxRow?.page_number === "number" ? maxRow.page_number : 0;

    if (a > maxSeen && b > maxSeen) {
      return errorJson(ctx, "Nothing to reorder", 400);
    }

    if (a >= BINDER_PAGE_SWAP_TEMP - 2 || b >= BINDER_PAGE_SWAP_TEMP - 2) {
      return errorJson(ctx, "Invalid page index", 400);
    }

    const temp = BINDER_PAGE_SWAP_TEMP;

    const { error: e1 } = await supabase
      .from("binder_slots")
      .update({ page_number: temp })
      .eq("binder_id", binderId)
      .eq("page_number", a);

    if (e1) {
      return errorJson(ctx, e1.message, 500);
    }

    const { error: e2 } = await supabase
      .from("binder_slots")
      .update({ page_number: a })
      .eq("binder_id", binderId)
      .eq("page_number", b);

    if (e2) {
      await supabase
        .from("binder_slots")
        .update({ page_number: a })
        .eq("binder_id", binderId)
        .eq("page_number", temp);
      return errorJson(ctx, e2.message, 500);
    }

    const { error: e3 } = await supabase
      .from("binder_slots")
      .update({ page_number: b })
      .eq("binder_id", binderId)
      .eq("page_number", temp);

    if (e3) {
      return errorJson(ctx, e3.message, 500);
    }

    return successJson(ctx, { ok: true, duration_ms: Date.now() - ctx.startedAt });
  } catch {
    return errorJson(ctx, "Server error", 500);
  }
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/pages/reorder",
  POST_handler
);
