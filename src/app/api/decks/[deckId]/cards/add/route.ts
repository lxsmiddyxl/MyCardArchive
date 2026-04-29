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

  const { data: card, error: cardErr } = await supabase
    .from("cards")
    .select("id, user_id")
    .eq("id", cardId)
    .maybeSingle();
  if (cardErr) {
    return NextResponse.json({ error: cardErr.message }, { status: 500 });
  }
  if (!card || card.user_id !== user.id) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const zoneValue = zone as "main" | "sideboard" | "commander";
  const { data: existing } = await supabase
    .from("deck_cards")
    .select("quantity")
    .eq("deck_id", deckId)
    .eq("card_id", cardId)
    .eq("section", zoneValue)
    .maybeSingle();

  const nextQuantity = (existing?.quantity ?? 0) + 1;
  const { data, error } = await supabase
    .from("deck_cards")
    .upsert(
      {
        deck_id: deckId,
        card_id: cardId,
        section: zoneValue,
        quantity: nextQuantity,
      },
      { onConflict: "deck_id,card_id,section" }
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const refreshed = await refreshDeckStats(supabase, deckId);

  return NextResponse.json({
    deck_card: data,
    deck_stats_synced: refreshed.ok,
    ...(refreshed.ok ? {} : { deck_stats_error: refreshed.error }),
  });
}

export const POST = defineRoute(
  "POST /api/decks/[deckId]/cards/add",
  POST_handler
);
