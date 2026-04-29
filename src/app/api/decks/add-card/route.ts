import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { defineRouteSimple } from "@/lib/server/api-route";
import { refreshDeckStats } from "@/lib/decks/stats";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = {
  deck_id?: string;
  card_id?: string;
  quantity?: number;
  section?: string;
};

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const deckId = body.deck_id?.trim();
  const cardId = body.card_id?.trim();
  const section = (body.section ?? "main").trim() || "main";
  const addQty =
    typeof body.quantity === "number" && Number.isFinite(body.quantity)
      ? Math.max(1, Math.floor(body.quantity))
      : 1;

  if (!deckId || !cardId) {
    return NextResponse.json(
      { error: "deck_id and card_id are required" },
      { status: 400 }
    );
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
    return NextResponse.json(
      { error: "Card not found or not owned by you" },
      { status: 403 }
    );
  }

  const { data: existing } = await supabase
    .from("deck_cards")
    .select("quantity")
    .eq("deck_id", deckId)
    .eq("card_id", cardId)
    .eq("section", section)
    .maybeSingle();

  const nextQty = (existing?.quantity ?? 0) + addQty;

  const { data: row, error: upErr } = await supabase
    .from("deck_cards")
    .upsert(
      {
        deck_id: deckId,
        card_id: cardId,
        section,
        quantity: nextQty,
      },
      { onConflict: "deck_id,card_id,section" }
    )
    .select("*")
    .single();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  const stats = await refreshDeckStats(supabase, deckId);
  if (!stats.ok) {
    return NextResponse.json(
      { error: stats.error, deck_card: row },
      { status: 500 }
    );
  }

  return NextResponse.json({ deck_card: row });
}

export const POST = defineRouteSimple("POST /api/decks/add-card", POST_handler);
