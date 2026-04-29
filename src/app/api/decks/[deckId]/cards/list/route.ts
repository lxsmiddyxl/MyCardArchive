import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { PRIVATE_SHORT_CACHE_HEADERS } from "@/lib/server/private-cache-control";
import { defineRoute } from "@/lib/server/api-route";
import { withQueryTiming } from "@/lib/server/query-timing";
import { withSupabaseCall } from "@/lib/server/supabase-call";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DeckCardWithCard = {
  deck_id: string;
  card_id: string;
  quantity: number;
  section: string;
  cards:
    | {
        id: string;
        name: string;
        image_url: string | null;
        rarity: string | null;
        number: string | null;
      }
    | {
        id: string;
        name: string;
        image_url: string | null;
        rarity: string | null;
        number: string | null;
      }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  return withQueryTiming("GET /api/decks/[deckId]/cards/list", async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deckId = context.params.deckId?.trim();
  if (!deckId) {
    return NextResponse.json({ error: "deckId is required" }, { status: 400 });
  }

  const { data: deck, error: deckErr } = await withSupabaseCall(
    "deck_cards list ownership",
    () => fetchOwnedDeck(supabase, user.id, deckId)
  );
  if (deckErr || !deck) {
    return NextResponse.json(
      { error: deckErr?.message ?? "Deck not found" },
      { status: deckErr ? 500 : 404 }
    );
  }

  const { data, error } = await withSupabaseCall("deck_cards list rows", () =>
    supabase
      .from("deck_cards")
      .select("deck_id, card_id, quantity, section, cards(id, name, image_url, rarity, number)")
      .eq("deck_id", deckId)
      .order("section", { ascending: true })
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const zones: Record<"main" | "sideboard" | "commander", DeckCardWithCard[]> = {
    main: [],
    sideboard: [],
    commander: [],
  };

  ((data ?? []) as DeckCardWithCard[]).forEach((row) => {
    const card = firstRelation(row.cards);
    const zone = (row.section ?? "main") as "main" | "sideboard" | "commander";
    const normalized = { ...row, cards: card };
    if (zone in zones) {
      zones[zone].push(normalized);
    } else {
      zones.main.push(normalized);
    }
  });

  return NextResponse.json(
    {
      deck_id: deckId,
      cards: zones,
    },
    { headers: PRIVATE_SHORT_CACHE_HEADERS }
  );
  });
}

export const GET = defineRoute(
  "GET /api/decks/[deckId]/cards/list",
  GET_handler
);
