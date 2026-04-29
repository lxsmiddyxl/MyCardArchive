import {
  computeLegality,
  normalizeDeckFormat,
  type DeckCardRow,
} from "@/lib/decks/legality-compute";
import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(
  _request: Request,
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

  const { data: deck, error: deckErr } = await fetchOwnedDeck(supabase, user.id, deckId);
  if (deckErr || !deck) {
    return NextResponse.json(
      { error: deckErr?.message ?? "Deck not found" },
      { status: deckErr ? 500 : 404 }
    );
  }

  const format = normalizeDeckFormat(deck.format);

  const { data, error } = await supabase
    .from("deck_cards")
    .select(
      `
      card_id,
      quantity,
      section,
      cards (
        id,
        name,
        catalog_card_id,
        catalog_cards (
          id,
          name,
          supertype,
          subtypes,
          legal_standard,
          legal_expanded,
          legal_unlimited,
          legal_commander
        )
      )
    `
    )
    .eq("deck_id", deckId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { legal, issues } = computeLegality(format, (data ?? []) as DeckCardRow[]);

  return NextResponse.json({
    format,
    legal,
    issues,
  });
}

export const GET = defineRoute("GET /api/decks/[deckId]/legality", GET_handler);
