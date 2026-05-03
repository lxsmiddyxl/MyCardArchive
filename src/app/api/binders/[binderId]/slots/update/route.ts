import { createClient } from "@/lib/supabase/route";
import type { BinderSlotDTO } from "@/lib/dto/binder";
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

    let body: {
      page_number?: number;
      slot_index?: number;
      card_id?: string | null;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return errorJson(ctx, "Invalid JSON", 400);
    }

    const pageNumber =
      typeof body.page_number === "number" && Number.isFinite(body.page_number)
        ? Math.max(0, Math.floor(body.page_number))
        : NaN;
    const slotIndex =
      typeof body.slot_index === "number" && Number.isFinite(body.slot_index)
        ? Math.floor(body.slot_index)
        : NaN;

    if (!Number.isFinite(pageNumber) || !Number.isFinite(slotIndex)) {
      return errorJson(ctx, "page_number and slot_index are required", 400);
    }

    if (slotIndex < 0 || slotIndex > 23) {
      return errorJson(ctx, "slot_index out of range", 400);
    }

    const cardIdRaw = body.card_id;
    const cardId =
      typeof cardIdRaw === "string" && cardIdRaw.trim().length > 0
        ? cardIdRaw.trim()
        : cardIdRaw === null
          ? null
          : undefined;

    if (cardId === undefined) {
      return errorJson(ctx, "card_id is required (or null to clear)", 400);
    }

    if (cardId !== null) {
      const { data: card, error: cErr } = await supabase
        .from("cards")
        .select("id, binder_id")
        .eq("id", cardId)
        .eq("user_id", userId)
        .maybeSingle();

      if (cErr) {
        return errorJson(ctx, cErr.message, 500);
      }
      if (!card || card.binder_id !== binderId) {
        return errorJson(ctx, "Card must belong to this binder", 400);
      }
    }

    const { data: row, error: upErr } = await supabase
      .from("binder_slots")
      .upsert(
        {
          binder_id: binderId,
          page_number: pageNumber,
          slot_index: slotIndex,
          card_id: cardId,
        },
        { onConflict: "binder_id,page_number,slot_index" }
      )
      .select(
        `
      id,
      binder_id,
      page_number,
      slot_index,
      card_id,
      created_at,
      cards (
        id,
        name,
        image_url,
        rarity,
        number,
        binder_id
      )
    `
      )
      .single();

    if (upErr) {
      return errorJson(ctx, upErr.message, 500);
    }

    return successJson(ctx, {
      slot: row as BinderSlotDTO,
      duration_ms: Date.now() - ctx.startedAt,
    });
  } catch {
    return errorJson(ctx, "Server error", 500);
  }
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/slots/update",
  POST_handler
);
