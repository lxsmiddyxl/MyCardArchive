import { createClient } from "@/lib/supabase/route";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type SlotRef = { page: number; slot: number };

function normalizeSlotRef(raw: unknown): SlotRef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const page =
    typeof o.page === "number" && Number.isFinite(o.page)
      ? Math.max(0, Math.floor(o.page))
      : NaN;
  const slot =
    typeof o.slot === "number" && Number.isFinite(o.slot)
      ? Math.floor(o.slot)
      : NaN;
  if (!Number.isFinite(page) || !Number.isFinite(slot)) return null;
  if (slot < 0 || slot > 23) return null;
  return { page, slot };
}

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

    let body: { from?: unknown; to?: unknown };
    try {
      body = (await request.json()) as { from?: unknown; to?: unknown };
    } catch {
      return errorJson(ctx, "Invalid JSON", 400);
    }

    const from = normalizeSlotRef(body.from);
    const to = normalizeSlotRef(body.to);
    if (!from || !to) {
      return errorJson(ctx, "from and to must be { page: number, slot: number }", 400);
    }

    if (from.page === to.page && from.slot === to.slot) {
      return successJson(ctx, {
        ok: true,
        message: "No-op",
        duration_ms: Date.now() - ctx.startedAt,
      });
    }

    async function readCardId(page: number, slot: number): Promise<string | null> {
      const { data } = await supabase
        .from("binder_slots")
        .select("card_id")
        .eq("binder_id", binderId)
        .eq("page_number", page)
        .eq("slot_index", slot)
        .maybeSingle();
      return data?.card_id ?? null;
    }

    const fromCard = await readCardId(from.page, from.slot);
    const toCard = await readCardId(to.page, to.slot);

    const { error: upErr } = await supabase.from("binder_slots").upsert(
      [
        {
          binder_id: binderId,
          page_number: from.page,
          slot_index: from.slot,
          card_id: toCard,
        },
        {
          binder_id: binderId,
          page_number: to.page,
          slot_index: to.slot,
          card_id: fromCard,
        },
      ],
      { onConflict: "binder_id,page_number,slot_index" }
    );

    if (upErr) {
      return errorJson(ctx, upErr.message, 500);
    }

    return successJson(ctx, { ok: true, duration_ms: Date.now() - ctx.startedAt });
  } catch {
    return errorJson(ctx, "Server error", 500);
  }
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/slots/move",
  POST_handler
);
