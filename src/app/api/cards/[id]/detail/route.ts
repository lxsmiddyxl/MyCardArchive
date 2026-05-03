import { getCardImagePublicUrls } from "@/lib/cards/storage-paths";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import type { CardDetailDTO } from "@/lib/dto/route-types";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

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
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const cardId = context.params.id?.trim();
  if (!cardId) {
    return errorJson(ctx, "Invalid card id", 400);
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
    .eq("user_id", userId)
    .maybeSingle();

  if (cardError) {
    return errorJson(ctx, cardError.message, 500);
  }
  if (!cardData) {
    return errorJson(ctx, "Card not found", 404);
  }

  const card = cardData as unknown as CardRow;

  const [{ data: deckLocData, error: deckLocError }, { data: priceData, error: priceError }] =
    await Promise.all([
      supabase
        .from("deck_cards")
        .select("deck_id, quantity, section, decks!inner(id, name, user_id)")
        .eq("card_id", cardId)
        .eq("decks.user_id", userId),
      supabase
        .from("card_prices")
        .select("market_price, currency, provider, updated_at")
        .eq("card_id", cardId)
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (deckLocError) {
    return errorJson(ctx, deckLocError.message, 500);
  }
  if (priceError) {
    return errorJson(ctx, priceError.message, 500);
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

  const detail: CardDetailDTO & {
    image_front_thumb_url: string | null;
    image_front_full_url: string | null;
    image_back_full_url: string | null;
    image_back_thumb_url: string | null;
    catalog: {
      id: string;
      name: string;
      supertype: string | null;
      subtypes: string[];
      legal_standard: boolean;
      legal_expanded: boolean;
      legal_unlimited: boolean;
      legal_commander: boolean;
    } | null;
    deck_locations: {
      deck_id: string;
      deck_name: string;
      zone: string;
      quantity: number;
    }[];
    price: {
      market_price: number | null;
      currency: string | null;
      provider: string | null;
      updated_at: string;
    } | null;
  } = {
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
    };
  return successJson(ctx, {
    card: {
      ...detail,
    },
    duration_ms: Date.now() - ctx.startedAt,
  });
}

export const GET = defineRoute("GET /api/cards/[id]/detail", GET_handler);
