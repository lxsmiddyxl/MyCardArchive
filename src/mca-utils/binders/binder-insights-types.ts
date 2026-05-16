import type { BinderRarityDistribution, RarityBucket } from "@/lib/catalog/binder-rarity-hints";
import type { SetCompletionProgress } from "@/lib/catalog/set-progress";
import type { VariantDistribution } from "@/lib/catalog/variant-distribution";

export type BinderInsightCardRow = {
  id: string;
  catalog_card_id: string | null;
  rarity: string | null;
  updated_at: string | null;
  catalog: {
    id: string;
    set_id: string | null;
    name: string;
    number: string | null;
    rarity: string | null;
    subtypes: string[] | null;
    image_small: string | null;
    set: {
      id: string;
      name: string;
      symbol_url: string | null;
      logo_url: string | null;
    } | null;
  } | null;
};

export type BinderMissingCard = {
  catalog_card_id: string;
  set_id: string;
  set_name: string;
  name: string;
  number: string;
  rarity: string | null;
  image_small: string | null;
};

export type BinderSetInsight = {
  set_id: string;
  set_name: string;
  symbol_url: string | null;
  logo_url: string | null;
  progress: SetCompletionProgress;
  rarity_distribution: BinderRarityDistribution;
  variant_distribution: VariantDistribution;
  missing_count: number;
};

export type BinderInsightsOverview = {
  binder_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
  total_cards: number;
  unique_catalog_cards: number;
  sets_represented: number;
};

export type BinderInsights = {
  overview: BinderInsightsOverview;
  rarity_distribution: BinderRarityDistribution;
  variant_distribution: VariantDistribution;
  duplicate_count: number;
  total_variants: number;
  sets: BinderSetInsight[];
};

export type MissingCardsSort = "number" | "rarity" | "name";

export type BinderMissingBySet = {
  set_id: string;
  set_name: string;
  symbol_url: string | null;
  logo_url: string | null;
  missing: BinderMissingCard[];
};

export type BinderMissingResult = {
  binder_id: string;
  sort: MissingCardsSort;
  sets: BinderMissingBySet[];
};

export const RARITY_SORT_ORDER: RarityBucket[] = [
  "common",
  "uncommon",
  "rare",
  "ultra",
  "secret",
  "other",
];
