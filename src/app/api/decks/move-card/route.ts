import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { defineRouteSimple } from "@/lib/server/api-route";
import { refreshDeckStats } from "@/lib/decks/stats";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Body = {
  deck_id?: string;
  card_id?: string;
  from_section?: string;
  to_section?: string;
  quantity?: number;
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
  const fromSection = (body.from_section ?? "main").trim() || "main";
  const toSection = (body.to_section ?? "main").trim() || "main";

  if (!deckId || !cardId) {
    return NextResponse.json(
      { error: "deck_id and card_id are required" },
      { status: 400 }
    );
  }

  if (fromSection === toSection) {
    return NextResponse.json({ ok: true });
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

  const { data: source, error: srcErr } = await supabase
    .from("deck_cards")
    .select("quantity")
    .eq("deck_id", deckId)
    .eq("card_id", cardId)
    .eq("section", fromSection)
    .maybeSingle();

  if (srcErr) {
    return NextResponse.json({ error: srcErr.message }, { status: 500 });
  }
  if (!source || source.quantity < 1) {
    return NextResponse.json({ error: "Card not in source section" }, { status: 404 });
  }

  const moveQty =
    typeof body.quantity === "number" &&
    Number.isFinite(body.quantity) &&
    body.quantity > 0
      ? Math.min(Math.floor(body.quantity), source.quantity)
      : source.quantity;

  const { data: target } = await supabase
    .from("deck_cards")
    .select("quantity")
    .eq("deck_id", deckId)
    .eq("card_id", cardId)
    .eq("section", toSection)
    .maybeSingle();

  const remaining = source.quantity - moveQty;
  if (remaining <= 0) {
    const { error: delErr } = await supabase
      .from("deck_cards")
      .delete()
      .eq("deck_id", deckId)
      .eq("card_id", cardId)
      .eq("section", fromSection);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
  } else {
    const { error: upErr } = await supabase
      .from("deck_cards")
      .update({ quantity: remaining })
      .eq("deck_id", deckId)
      .eq("card_id", cardId)
      .eq("section", fromSection);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
  }

  const nextTarget = (target?.quantity ?? 0) + moveQty;
  const { error: upTgt } = await supabase.from("deck_cards").upsert(
    {
      deck_id: deckId,
      card_id: cardId,
      section: toSection,
      quantity: nextTarget,
    },
    { onConflict: "deck_id,card_id,section" }
  );

  if (upTgt) {
    return NextResponse.json({ error: upTgt.message }, { status: 500 });
  }

  const stats = await refreshDeckStats(supabase, deckId);
  if (!stats.ok) {
    return NextResponse.json({ error: stats.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/decks/move-card", POST_handler);
