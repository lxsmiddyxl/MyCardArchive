import { getCardImagePublicUrls } from "@/lib/cards/storage-paths";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Context = { params: Record<string, string> };

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type CardRow = {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  set_name: string | null;
  image_url: string | null;
  binder_id: string;
  catalog_card_id: string | null;
  for_trade: boolean;
  looking_for: boolean;
  binders: { id: string; name: string } | { id: string; name: string }[] | null;
  catalog_cards:
    | {
        id: string;
        name: string;
        supertype: string | null;
        subtypes: string[];
        legal_standard: boolean;
        legal_expanded: boolean;
        legal_unlimited: boolean;
        legal_commander: boolean;
        set_id: string;
        catalog_sets: { id: string; name: string } | { id: string; name: string }[] | null;
      }
    | {
        id: string;
        name: string;
        supertype: string | null;
        subtypes: string[];
        legal_standard: boolean;
        legal_expanded: boolean;
        legal_unlimited: boolean;
        legal_commander: boolean;
        set_id: string;
        catalog_sets: { id: string; name: string } | { id: string; name: string }[] | null;
      }[]
    | null;
};

type DeckLocationRow = {
  deck_id: string;
  quantity: number;
  section: string;
  decks: { id: string; name: string; user_id: string } | { id: string; name: string; user_id: string }[] | null;
};

async function GET_handler(_request: Request, context: Context) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cardId = context.params.id?.trim();
  if (!cardId) {
    return NextResponse.json({ error: "Invalid card id" }, { status: 400 });
  }

  const { data: cardData, error: cardError } = await supabase
    .from("cards")
    .select(
      `
      id,
      name,
      number,
      rarity,
      set_name,
      image_url,
      binder_id,
      catalog_card_id,
      for_trade,
      looking_for,
      binders(id, name),
      catalog_cards(
        id,
        name,
        supertype,
        subtypes,
        legal_standard,
        legal_expanded,
        legal_unlimited,
        legal_commander,
        set_id,
        catalog_sets(id, name)
      )
    `
    )
    .eq("id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (cardError) {
    return NextResponse.json({ error: cardError.message }, { status: 500 });
  }
  if (!cardData) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const card = cardData as unknown as CardRow;

  const [{ data: deckLocData, error: deckLocError }, { data: priceData, error: priceError }] =
    await Promise.all([
      supabase
        .from("deck_cards")
        .select("deck_id, quantity, section, decks!inner(id, name, user_id)")
        .eq("card_id", cardId)
        .eq("decks.user_id", user.id),
      supabase
        .from("card_prices")
        .select("market_price, currency, provider, updated_at")
        .eq("card_id", cardId)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (deckLocError) {
    return NextResponse.json({ error: deckLocError.message }, { status: 500 });
  }
  if (priceError) {
    return NextResponse.json({ error: priceError.message }, { status: 500 });
  }

  const binder = firstRelation(card.binders);
  const catalog = firstRelation(card.catalog_cards);
  const catalogSet = firstRelation(catalog?.catalog_sets ?? null);
  const storageUrls = getCardImagePublicUrls(card.id);
  const deck_locations = ((deckLocData ?? []) as DeckLocationRow[]).map((row) => {
    const deck = firstRelation(row.decks);
    return {
      deck_id: row.deck_id,
      deck_name: deck?.name ?? row.deck_id,
      zone: row.section,
      quantity: row.quantity,
    };
  });

  return NextResponse.json({
    card: {
      id: card.id,
      name: card.name,
      number: card.number,
      rarity: card.rarity,
      set_name: card.set_name ?? catalogSet?.name ?? catalog?.set_id ?? null,
      image_url: card.image_url,
      image_front_thumb_url: card.image_url,
      image_front_full_url: storageUrls.image_front_full_url,
      image_back_full_url: storageUrls.image_back_full_url,
      image_back_thumb_url: storageUrls.image_back_thumb_url,
      catalog_card_id: card.catalog_card_id,
      for_trade: card.for_trade,
      looking_for: card.looking_for,
      binder_id: card.binder_id,
      binder_name: binder?.name ?? null,
      catalog: catalog
        ? {
            id: catalog.id,
            name: catalog.name,
            supertype: catalog.supertype,
            subtypes: catalog.subtypes ?? [],
            legal_standard: catalog.legal_standard,
            legal_expanded: catalog.legal_expanded,
            legal_unlimited: catalog.legal_unlimited,
            legal_commander: catalog.legal_commander,
          }
        : null,
      deck_locations,
      price: priceData
        ? {
            market_price: priceData.market_price,
            currency: priceData.currency,
            provider: priceData.provider,
            updated_at: priceData.updated_at,
          }
        : null,
    },
  });
}

export const GET = defineRoute("GET /api/cards/[id]/detail", GET_handler);
