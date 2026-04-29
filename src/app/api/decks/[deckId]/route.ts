import { fetchOwnedDeck } from "@/lib/decks/ownership";
import { defineRoute } from "@/lib/server/api-route";
import { withQueryTiming } from "@/lib/server/query-timing";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type DeckCardRow = {
  deck_id: string;
  card_id: string;
  quantity: number;
  section: string;
  cards: Record<string, unknown> | null;
};

function groupBySection(rows: DeckCardRow[]) {
  const map = new Map<string, DeckCardRow[]>();
  for (const r of rows) {
    const sec = r.section || "main";
    const list = map.get(sec);
    if (list) {
      list.push(r);
    } else {
      map.set(sec, [r]);
    }
  }
  return Object.fromEntries(map.entries());
}

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  return withQueryTiming("GET /api/decks/[deckId]", async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deckId = context.params.deckId?.trim();
  if (!deckId) {
    return NextResponse.json({ error: "Invalid deck id" }, { status: 400 });
  }

  const { data: vis, error: visErr } = await supabase.rpc(
    "get_deck_visibility",
    { p_deck_id: deckId }
  );

  if (visErr) {
    return NextResponse.json({ error: visErr.message }, { status: 500 });
  }

  const visibility = vis as { found?: boolean; is_owner?: boolean } | null;
  if (!visibility?.found) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }
  if (!visibility.is_owner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const { data: stats, error: stErr } = await supabase
    .from("deck_stats")
    .select("*")
    .eq("deck_id", deckId)
    .maybeSingle();

  if (stErr) {
    return NextResponse.json({ error: stErr.message }, { status: 500 });
  }

  const { data: cardRows, error: cErr } = await supabase
    .from("deck_cards")
    .select(
      `
      *,
      cards (
        id,
        name,
        image_url,
        rarity,
        catalog_card_id,
        catalog_cards (
          id,
          name,
          number,
          rarity,
          supertype,
          subtypes,
          image_small,
          image_large,
          set_id,
          catalog_sets ( id, name )
        )
      )
    `
    )
    .eq("deck_id", deckId)
    .order("section", { ascending: true });

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }

  const deck_cards_by_section = groupBySection(
    (cardRows ?? []) as unknown as DeckCardRow[]
  );

  return NextResponse.json({
    deck,
    deck_stats: stats,
    deck_cards_by_section,
  });
  });
}

export const GET = defineRoute("GET /api/decks/[deckId]", GET_handler);
