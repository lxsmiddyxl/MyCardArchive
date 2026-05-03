import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { updateHaveListIndex } from "@/lib/matching/index-maintenance";
import { logApiValidationFailure } from "@/lib/server/validation-telemetry";
import { createClient } from "@/lib/supabase/server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { MUTATION_LIMITS } from "@/lib/validation/mutation-limits";
import {
  assertCanCreateCard,
  isTierLimitError,
} from "@/lib/tier/check-limits";
import { NextResponse } from "next/server";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: {
    binder_id?: string;
    name?: string;
    number?: string | null;
    rarity?: string | null;
    set_name?: string | null;
    image_url?: string | null;
    scan_event_id?: string;
    catalog_card_id?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const binderId = typeof body.binder_id === "string" ? body.binder_id.trim() : "";
  if (!binderId) {
    return errorJson(ctx, "binder_id is required", 400);
  }

  const { data: binder, error: binderError } = await supabase
    .from("binders")
    .select("id")
    .eq("id", binderId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (binderError) {
    return errorJson(ctx, binderError.message, 500);
  }

  if (!binder) {
    return errorJson(ctx, "Binder not found", 404);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return errorJson(ctx, "name is required", 400);
  }
  if (name.length > MUTATION_LIMITS.cardNameMax) {
    logApiValidationFailure("POST /api/cards", "name", "max_length");
    return errorJson(ctx, "name is too long", 400);
  }

  const number =
    typeof body.number === "string" && body.number.trim().length > 0
      ? body.number.trim()
      : null;
  const rarity =
    typeof body.rarity === "string" && body.rarity.trim().length > 0
      ? body.rarity.trim()
      : null;
  const set_name =
    typeof body.set_name === "string" && body.set_name.trim().length > 0
      ? body.set_name.trim()
      : null;
  const image_url =
    typeof body.image_url === "string" && body.image_url.trim().length > 0
      ? body.image_url.trim()
      : null;

  const catalog_card_id =
    typeof body.catalog_card_id === "string" &&
    body.catalog_card_id.trim().length > 0
      ? body.catalog_card_id.trim()
      : null;

  const scanEventId =
    typeof body.scan_event_id === "string" && body.scan_event_id.trim().length > 0
      ? body.scan_event_id.trim()
      : null;

  if (scanEventId) {
    const { data: existingScan, error: scanLookupErr } = await supabase
      .from("scan_events")
      .select("id, card_id")
      .eq("id", scanEventId)
      .eq("user_id", session.userId)
      .maybeSingle();

    if (scanLookupErr) {
      return errorJson(ctx, scanLookupErr.message, 500);
    }

    if (!existingScan) {
      return errorJson(ctx, "Scan event not found", 404);
    }

    if (existingScan.card_id != null) {
      return errorJson(ctx, "This scan is already linked to a card", 409);
    }
  }

  try {
    await assertCanCreateCard(supabase);
  } catch (e) {
    if (isTierLimitError(e)) {
      return errorJson(ctx, e.message, 403);
    }
    throw e;
  }

  const { data, error } = await supabase
    .from("cards")
    .insert({
      binder_id: binderId,
      user_id: session.userId,
      name,
      number,
      rarity,
      ...(set_name ? { set_name } : {}),
      image_url,
      ...(catalog_card_id ? { catalog_card_id } : {}),
    })
    .select("*")
    .single();

  if (error || !data) {
    return errorJson(ctx, error?.message ?? "Insert failed", 500);
  }

  try {
    await updateHaveListIndex(supabase, session.userId, data.id, 1);
  } catch (e) {
    await supabase.from("cards").delete().eq("id", data.id).eq("user_id", session.userId);
    return errorJson(
      ctx,
      e instanceof Error ? e.message : "Could not update have-list index",
      500
    );
  }

  if (scanEventId) {
    const { error: linkErr } = await supabase
      .from("scan_events")
      .update({ card_id: data.id })
      .eq("id", scanEventId)
      .eq("user_id", session.userId)
      .is("card_id", null);

    if (linkErr) {
      await supabase.from("cards").delete().eq("id", data.id).eq("user_id", session.userId);
      return errorJson(ctx, linkErr.message, 500);
    }
  }

  return NextResponse.json({ success: true, context_id: ctx.contextId, card: data });
}

export const POST = defineRouteSimple("POST /api/cards", POST_handler);
