import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import type { CardSummaryDTO } from "@/lib/dto/catalog";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/cards/[id]", surfaceName: "marketplace" } as const;

async function PATCH_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const params = context.params;
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const id = params["id"]?.trim();
  if (!id) {
    return errorJson(ctx, "Invalid id", 400);
  }

  let body: {
    binder_id?: string;
    name?: string;
    number?: string | null;
    rarity?: string | null;
    image_url?: string | null;
    for_trade?: boolean;
    looking_for?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    const trimmed = body.name.trim();
    if (!trimmed) {
      return errorJson(ctx, "name cannot be empty", 400);
    }
    patch.name = trimmed;
  }

  if (typeof body.number === "string") {
    patch.number = body.number.trim() || null;
  } else if (body.number === null) {
    patch.number = null;
  }

  if (typeof body.rarity === "string") {
    patch.rarity = body.rarity.trim() || null;
  } else if (body.rarity === null) {
    patch.rarity = null;
  }

  if (typeof body.image_url === "string") {
    patch.image_url = body.image_url.trim() || null;
  } else if (body.image_url === null) {
    patch.image_url = null;
  }

  if (typeof body.for_trade === "boolean") {
    patch.for_trade = body.for_trade;
  }
  if (typeof body.looking_for === "boolean") {
    patch.looking_for = body.looking_for;
  }

  if ("for_trade" in patch || "looking_for" in patch) {
    const { data: cur, error: curErr } = await supabase
      .from("cards")
      .select("catalog_card_id, for_trade, looking_for")
      .eq("id", id)
      .eq("user_id", session.userId)
      .maybeSingle();

    if (curErr) {
      return errorJson(ctx, curErr.message, 500);
    }
    if (!cur) {
      return errorJson(ctx, "Not found", 404);
    }

    const nextFt = typeof patch.for_trade === "boolean" ? patch.for_trade : cur.for_trade;
    const nextLf = typeof patch.looking_for === "boolean" ? patch.looking_for : cur.looking_for;
    if ((nextFt || nextLf) && !cur.catalog_card_id) {
      return errorJson(
        ctx,
        "Link this card to a catalog card before marking For trade or Looking for (marketplace matches use catalog identity).",
        400
      );
    }
  }

  if (typeof body.binder_id === "string" && body.binder_id.trim().length > 0) {
    const { data: binder, error: binderError } = await supabase
      .from("binders")
      .select("id")
      .eq("id", body.binder_id.trim())
      .eq("user_id", session.userId)
      .maybeSingle();

    if (binderError) {
      return errorJson(ctx, binderError.message, 500);
    }

    if (!binder) {
      return errorJson(ctx, "Binder not found", 400);
    }

    patch.binder_id = body.binder_id.trim();
  }

  if (Object.keys(patch).length === 0) {
    return errorJson(ctx, "No valid fields to update", 400);
  }

  const { data, error } = await supabase
    .from("cards")
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

  if ("for_trade" in patch || "looking_for" in patch) {
    mcaLog.event(
      "market.flag.set",
      {
        cardId: id,
        for_trade: data.for_trade,
        looking_for: data.looking_for,
        catalog_card_id: data.catalog_card_id,
      },
      CTX
    );
  }

  return NextResponse.json({ success: true, context_id: ctx.contextId, card: data as CardSummaryDTO });
}

async function DELETE_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const params = context.params;
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const id = params["id"]?.trim();
  if (!id) {
    return errorJson(ctx, "Invalid id", 400);
  }

  const { data, error } = await supabase
    .from("cards")
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
}

export const PATCH = defineRoute("PATCH /api/cards/[id]", PATCH_handler);
export const DELETE = defineRoute("DELETE /api/cards/[id]", DELETE_handler);
