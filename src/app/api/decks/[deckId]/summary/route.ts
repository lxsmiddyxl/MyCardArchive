import {
  computeLegality,
  normalizeDeckFormat,
  type DeckCardRow,
} from "@/lib/decks/legality-compute";
import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { PRIVATE_SHORT_CACHE_HEADERS } from "@/lib/server/private-cache-control";
import { defineRoute } from "@/lib/server/api-route";
import { withQueryTiming } from "@/lib/server/query-timing";
import { withSupabaseCall } from "@/lib/server/supabase-call";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  return withQueryTiming("GET /api/decks/[deckId]/summary", async () => {
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

  const { data: deck, error: deckErr } = await withSupabaseCall(
    "deck summary ownership",
    () => fetchOwnedDeck(supabase, user.id, deckId)
  );
  if (deckErr || !deck) {
    return NextResponse.json(
      { error: deckErr?.message ?? "Deck not found" },
      { status: deckErr ? 500 : 404 }
    );
  }

  const format = normalizeDeckFormat(deck.format);

  const [statsRes, cardsRes, deckStatsRes] = await withSupabaseCall(
    "deck summary parallel",
    () =>
      Promise.all([
        supabase
          .from("decks")
          .select(
            "id, is_public, type_distribution, rarity_distribution, set_distribution, estimated_value, top_cards"
          )
          .eq("id", deckId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
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
          .eq("deck_id", deckId),
        supabase
          .from("deck_stats")
          .select("total_cards, unique_cards, color_identity, updated_at")
          .eq("deck_id", deckId)
          .maybeSingle(),
      ])
  );

  if (statsRes.error) {
    return NextResponse.json({ error: statsRes.error.message }, { status: 500 });
  }
  if (!statsRes.data) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  if (cardsRes.error) {
    return NextResponse.json({ error: cardsRes.error.message }, { status: 500 });
  }

  const deck_stats = deckStatsRes.error ? null : (deckStatsRes.data ?? null);

  const { legal, issues } = computeLegality(format, (cardsRes.data ?? []) as DeckCardRow[]);

  return NextResponse.json(
    {
      deck: statsRes.data,
      deck_meta: {
        name:
          typeof deck.name === "string" && deck.name.trim()
            ? deck.name.trim()
            : "Untitled",
        format: typeof deck.format === "string" ? deck.format : "standard",
        description:
          deck.description != null && typeof deck.description === "string"
            ? deck.description
            : "",
      },
      deck_stats,
      legality: {
        format,
        legal,
        issues,
      },
      ...(deckStatsRes.error
        ? { deck_stats_error: deckStatsRes.error.message }
        : {}),
    },
    { headers: PRIVATE_SHORT_CACHE_HEADERS }
  );
  });
}

export const GET = defineRoute("GET /api/decks/[deckId]/summary", GET_handler);
