import { BINDER_SLOTS_PER_PAGE } from "@/lib/binders/constants";
import { getMaxBinderPagesForUser } from "@/lib/binders/page-limits";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function POST_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  try {
    const supabase = createClient();
    const session = await validateSession(supabase, ctx);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const binderId = context.params.binderId?.trim();
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

    const maxPages = await getMaxBinderPagesForUser(supabase);

    const { data: maxRow } = await supabase
      .from("binder_slots")
      .select("page_number")
      .eq("binder_id", binderId)
      .order("page_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentMax =
      typeof maxRow?.page_number === "number" ? maxRow.page_number : -1;
    const newPage = currentMax + 1;

    if (newPage >= maxPages) {
      return errorJson(ctx, `Page limit reached (${maxPages} pages for your plan).`, 403);
    }

    const rows = Array.from({ length: BINDER_SLOTS_PER_PAGE }, (_, slot_index) => ({
      binder_id: binderId,
      page_number: newPage,
      slot_index,
      card_id: null as string | null,
    }));

    const { error: upErr } = await supabase.from("binder_slots").upsert(rows, {
      onConflict: "binder_id,page_number,slot_index",
    });

    if (upErr) {
      return errorJson(ctx, upErr.message, 500);
    }

    return successJson(ctx, {
      ok: true,
      page_number: newPage,
      duration_ms: Date.now() - ctx.startedAt,
    });
  } catch {
    return errorJson(ctx, "Server error", 500);
  }
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/pages/add",
  POST_handler
);
