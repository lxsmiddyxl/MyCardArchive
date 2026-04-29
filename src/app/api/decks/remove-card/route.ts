import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { defineRouteSimple } from "@/lib/server/api-route";
import { refreshDeckStats } from "@/lib/decks/stats";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = {
  deck_id?: string;
  card_id?: string;
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

  const { data: row, error: rowErr } = await supabase
    .from("deck_cards")
    .select("quantity")
    .eq("deck_id", deckId)
    .eq("card_id", cardId)
    .eq("section", section)
    .maybeSingle();

  if (rowErr) {
    return NextResponse.json({ error: rowErr.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Card not in deck" }, { status: 404 });
  }

  if (row.quantity <= 1) {
    const { error: delErr } = await supabase
      .from("deck_cards")
      .delete()
      .eq("deck_id", deckId)
      .eq("card_id", cardId)
      .eq("section", section);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
  } else {
    const { error: upErr } = await supabase
      .from("deck_cards")
      .update({ quantity: row.quantity - 1 })
      .eq("deck_id", deckId)
      .eq("card_id", cardId)
      .eq("section", section);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  }

  const stats = await refreshDeckStats(supabase, deckId);
  if (!stats.ok) {
    return NextResponse.json({ error: stats.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/decks/remove-card", POST_handler);
