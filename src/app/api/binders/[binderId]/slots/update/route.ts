import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function POST_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const binderId = context.params["binderId"]?.trim();
    if (!binderId) {
      return NextResponse.json({ error: "Invalid binder id" }, { status: 400 });
    }

    const { data: binder, error: bErr } = await supabase
      .from("binders")
      .select("id")
      .eq("id", binderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }
    if (!binder) {
      return NextResponse.json({ error: "Binder not found" }, { status: 404 });
    }

    let body: {
      page_number?: number;
      slot_index?: number;
      card_id?: string | null;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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
      return NextResponse.json(
        { error: "page_number and slot_index are required" },
        { status: 400 }
      );
    }

    if (slotIndex < 0 || slotIndex > 23) {
      return NextResponse.json({ error: "slot_index out of range" }, { status: 400 });
    }

    const cardIdRaw = body.card_id;
    const cardId =
      typeof cardIdRaw === "string" && cardIdRaw.trim().length > 0
        ? cardIdRaw.trim()
        : cardIdRaw === null
          ? null
          : undefined;

    if (cardId === undefined) {
      return NextResponse.json(
        { error: "card_id is required (or null to clear)" },
        { status: 400 }
      );
    }

    if (cardId !== null) {
      const { data: card, error: cErr } = await supabase
        .from("cards")
        .select("id, binder_id")
        .eq("id", cardId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (cErr) {
        return NextResponse.json({ error: cErr.message }, { status: 500 });
      }
      if (!card || card.binder_id !== binderId) {
        return NextResponse.json(
          { error: "Card must belong to this binder" },
          { status: 400 }
        );
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
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ slot: row });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export const POST = defineRoute(
  "POST /api/binders/[binderId]/slots/update",
  POST_handler
);
