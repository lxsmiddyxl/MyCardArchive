import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type DeckRow = Database["public"]["Tables"]["decks"]["Row"];
type DeckCardRow = Database["public"]["Tables"]["deck_cards"]["Row"];
type CatalogCardRow = Database["public"]["Tables"]["catalog_cards"]["Row"];
type CardPriceRow = Database["public"]["Tables"]["card_prices"]["Row"];

export type CatalogLike = {
  id: string;
  name: string;
  setId: string;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[];
  imageSmall: string | null;
  imageLarge: string | null;
};

export type LoadDeckEditorPayload = {
  deck: DeckRow;
  deckCards: DeckCardRow[];
  catalogCards: CatalogCardRow[];
  catalog: CatalogLike[];
  cardPrices: CardPriceRow[];
};

type Params = {
  supabase: SupabaseClient<Database>;
  userId: string;
  deckId: string;
  search?: string;
  limit?: number;
};

export async function loadDeckEditor({
  supabase,
  userId,
  deckId,
  search = "",
  limit = 300,
}: Params): Promise<LoadDeckEditorPayload | null> {
  const { data: deck, error: deckErr } = await supabase
    .from("decks")
    .select("*")
    .eq("id", deckId)
    .eq("user_id", userId)
    .maybeSingle();
  if (deckErr) throw new Error(deckErr.message);
  if (!deck) return null;

  const { data: deckCards, error: cardsErr } = await supabase
    .from("deck_cards")
    .select("*")
    .eq("deck_id", deckId);
  if (cardsErr) throw new Error(cardsErr.message);

  const catalogRes = await loadCatalogCards(supabase, search, limit);
  if (catalogRes.error) throw new Error(catalogRes.error.message);
  const catalogCards = catalogRes.data ?? [];
  const catalog = catalogCards.map(normalizeCatalogCard);

  const ids = (deckCards ?? []).map((r) => r.card_id);
  const pricesRes =
    ids.length > 0
      ? await supabase.from("card_prices").select("*").in("card_id", ids)
      : ({ data: [], error: null } as {
          data: CardPriceRow[] | null;
          error: null;
        });

  if (pricesRes.error) throw new Error(pricesRes.error.message);

  return {
    deck,
    deckCards: deckCards ?? [],
    catalogCards,
    catalog,
    cardPrices: pricesRes.data ?? [],
  };
}

async function loadCatalogCards(
  supabase: SupabaseClient<Database>,
  search: string,
  limit: number
) {
  const q = search.trim();
  if (!q) {
    return supabase
      .from("catalog_cards")
      .select("*")
      .order("name", { ascending: true })
      .limit(limit);
  }

  const fts = await supabase
    .from("catalog_cards")
    .select("*")
    .textSearch("name", q, { type: "websearch", config: "english" })
    .limit(limit);

  if (
    fts.error &&
    (fts.error.message.includes("textSearch") ||
      fts.error.message.includes("operator does not exist"))
  ) {
    return supabase
      .from("catalog_cards")
      .select("*")
      .ilike("name", `%${q.replace(/[%_]/g, "")}%`)
      .limit(limit);
  }
  return fts;
}

function normalizeCatalogCard(card: CatalogCardRow): CatalogLike {
  return {
    id: card.id,
    name: card.name,
    setId: card.set_id,
    rarity: card.rarity,
    supertype: card.supertype,
    subtypes: card.subtypes,
    imageSmall: card.image_small,
    imageLarge: card.image_large,
  };
}
