import type { Database } from "@/lib/supabase/types";

export type DeckRow = Database["public"]["Tables"]["decks"]["Row"];
export type DeckStatsRow = Database["public"]["Tables"]["deck_stats"]["Row"];

export type DeckCardEmbedded = {
  deck_id: string;
  card_id: string;
  quantity: number;
  section: string;
  cards: {
    id: string;
    name: string;
    image_url: string | null;
    rarity: string | null;
    catalog_card_id: string | null;
    catalog_cards: {
      id: string;
      name: string;
      number: string;
      rarity: string | null;
      supertype: string | null;
      subtypes: string[];
      image_small: string | null;
      image_large: string | null;
      set_id: string;
      catalog_sets: { id: string; name: string } | null;
    } | null;
  } | null;
};

export type DeckCardsBySection = Record<string, DeckCardEmbedded[]>;

export type DeckEditorPayload = {
  deck: DeckRow;
  deck_stats: DeckStatsRow | null;
  deck_cards_by_section: DeckCardsBySection;
};
