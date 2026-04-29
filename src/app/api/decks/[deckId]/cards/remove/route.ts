import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { refreshDeckStats } from "@/lib/decks/stats";
import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = {
  card_id?: string;
  zone?: "main" | "sideboard" | "commander";
};

const ALLOWED_ZONES = new Set(["main", "sideboard", "commander"]);

async function POST_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deckId = context.params["deckId"]?.trim();
  if (!deckId) {
    return NextResponse.json({ error: "deckId is required" }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const cardId = body.card_id?.trim();
  const zone = (body.zone ?? "main").trim().toLowerCase();
  if (!cardId) {
    return NextResponse.json({ error: "card_id is required" }, { status: 400 });
  }
  if (!ALLOWED_ZONES.has(zone)) {
    return NextResponse.json({ error: "Invalid zone" }, { status: 400 });
  }

  const { data: deck, error: deckErr } = await fetchOwnedDeck(
    supabase,
    user.id,
    deckId
  );
  if (deckErr || !deck) {
    return NextResponse.json(
      { error: deckErr?.message ?? "Deck not found" },
      { status: deckErr ? 500 : 404 }
    );
  }

  const { data: row, error: rowErr } = await supabase
    .from("deck_cards")
    .select("quantity")
    .eq("deck_id", deckId)
    .eq("card_id", cardId)
    .eq("section", zone)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Card is not in this deck section" }, { status: 404 });
  }

  if (row.quantity <= 1) {
    const { error } = await supabase
      .from("deck_cards")
      .delete()
      .eq("deck_id", deckId)
      .eq("card_id", cardId)
      .eq("section", zone);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    const { error } = await supabase
      .from("deck_cards")
      .update({ quantity: row.quantity - 1 })
      .eq("deck_id", deckId)
      .eq("card_id", cardId)
      .eq("section", zone);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const refreshed = await refreshDeckStats(supabase, deckId);

  return NextResponse.json({
    ok: true,
    deck_stats_synced: refreshed.ok,
    ...(refreshed.ok ? {} : { deck_stats_error: refreshed.error }),
  });
}

export const POST = defineRoute(
  "POST /api/decks/[deckId]/cards/remove",
  POST_handler
);
