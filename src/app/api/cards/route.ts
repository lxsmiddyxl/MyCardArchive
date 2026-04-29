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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const binderId = typeof body.binder_id === "string" ? body.binder_id.trim() : "";
  if (!binderId) {
    return NextResponse.json({ error: "binder_id is required" }, { status: 400 });
  }

  const { data: binder, error: binderError } = await supabase
    .from("binders")
    .select("id")
    .eq("id", binderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (binderError) {
    return NextResponse.json({ error: binderError.message }, { status: 500 });
  }

  if (!binder) {
    return NextResponse.json({ error: "Binder not found" }, { status: 404 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (name.length > MUTATION_LIMITS.cardNameMax) {
    logApiValidationFailure("POST /api/cards", "name", "max_length");
    return NextResponse.json({ error: "name is too long" }, { status: 400 });
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
      .eq("user_id", user.id)
      .maybeSingle();

    if (scanLookupErr) {
      return NextResponse.json({ error: scanLookupErr.message }, { status: 500 });
    }

    if (!existingScan) {
      return NextResponse.json(
        { error: "Scan event not found" },
        { status: 404 }
      );
    }

    if (existingScan.card_id != null) {
      return NextResponse.json(
        { error: "This scan is already linked to a card" },
        { status: 409 }
      );
    }
  }

  try {
    await assertCanCreateCard(supabase);
  } catch (e) {
    if (isTierLimitError(e)) {
      return NextResponse.json({ success: false, error: e.message }, {
        status: 403,
      });
    }
    throw e;
  }

  const { data, error } = await supabase
    .from("cards")
    .insert({
      binder_id: binderId,
      user_id: user.id,
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
    return NextResponse.json(
      { error: error?.message ?? "Insert failed" },
      { status: 500 }
    );
  }

  try {
    await updateHaveListIndex(supabase, user.id, data.id, 1);
  } catch (e) {
    await supabase.from("cards").delete().eq("id", data.id).eq("user_id", user.id);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not update have-list index",
      },
      { status: 500 }
    );
  }

  if (scanEventId) {
    const { error: linkErr } = await supabase
      .from("scan_events")
      .update({ card_id: data.id })
      .eq("id", scanEventId)
      .eq("user_id", user.id)
      .is("card_id", null);

    if (linkErr) {
      await supabase.from("cards").delete().eq("id", data.id).eq("user_id", user.id);
      return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ card: data });
}

export const POST = defineRouteSimple("POST /api/cards", POST_handler);
