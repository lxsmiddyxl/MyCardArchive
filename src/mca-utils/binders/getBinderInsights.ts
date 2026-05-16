import {
  buildRarityDistribution,
  normalizeRarityBucket,
  type BinderRarityDistribution,
} from "@/lib/catalog/binder-rarity-hints";
import { computeSetCompletion } from "@/lib/catalog/set-progress";
import {
  buildVariantDistribution,
  countNonStandardVariants,
  normalizeVariantBucket,
  type VariantDistribution,
} from "@/lib/catalog/variant-distribution";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BinderInsightCardRow,
  BinderInsights,
  BinderMissingBySet,
  BinderMissingCard,
  BinderMissingResult,
  BinderSetInsight,
  MissingCardsSort,
} from "./binder-insights-types";
import { RARITY_SORT_ORDER } from "./binder-insights-types";

export type {
  BinderInsights,
  BinderMissingCard,
  BinderMissingResult,
  BinderSetInsight,
  MissingCardsSort,
} from "./binder-insights-types";

type CatalogJoin = {
  id: string;
  set_id: string | null;
  name: string;
  number: string | null;
  rarity: string | null;
  subtypes: string[] | null;
  image_small: string | null;
  catalog_sets:
    | {
        id: string;
        name: string;
        symbol_url: string | null;
        logo_url: string | null;
      }
    | {
        id: string;
        name: string;
        symbol_url: string | null;
        logo_url: string | null;
      }[]
    | null;
};

type CardSelectRow = {
  id: string;
  catalog_card_id: string | null;
  rarity: string | null;
  updated_at: string;
  catalog_cards: CatalogJoin | CatalogJoin[] | null;
};

function unwrapCatalog(row: CatalogJoin | CatalogJoin[] | null): CatalogJoin | null {
  if (!row) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

function unwrapSet(
  setRow: CatalogJoin["catalog_sets"]
): { id: string; name: string; symbol_url: string | null; logo_url: string | null } | null {
  if (!setRow) return null;
  const s = Array.isArray(setRow) ? setRow[0] : setRow;
  return s ?? null;
}

export function mapCardRows(rows: CardSelectRow[]): BinderInsightCardRow[] {
  return rows.map((row) => {
    const cat = unwrapCatalog(row.catalog_cards);
    const set = cat ? unwrapSet(cat.catalog_sets) : null;
    return {
      id: row.id,
      catalog_card_id: row.catalog_card_id,
      rarity: row.rarity,
      updated_at: row.updated_at,
      catalog: cat
        ? {
            id: cat.id,
            set_id: cat.set_id,
            name: cat.name,
            number: cat.number,
            rarity: cat.rarity,
            subtypes: cat.subtypes,
            image_small: cat.image_small,
            set: set
              ? {
                  id: set.id,
                  name: set.name,
                  symbol_url: set.symbol_url,
                  logo_url: set.logo_url,
                }
              : null,
          }
        : null,
    };
  });
}

export function cardNumberSortKey(number: string): [number, string] {
  const stem = (number.split("/")[0]?.trim() ?? number.trim()).replace(/^#/, "");
  const num = parseInt(stem, 10);
  return [Number.isFinite(num) ? num : 999_999, stem.toLowerCase()];
}

export function sortMissingCards(
  cards: BinderMissingCard[],
  sort: MissingCardsSort
): BinderMissingCard[] {
  const copy = [...cards];
  if (sort === "name") {
    copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return copy;
  }
  if (sort === "rarity") {
    copy.sort((a, b) => {
      const ai = RARITY_SORT_ORDER.indexOf(normalizeRarityBucket(a.rarity));
      const bi = RARITY_SORT_ORDER.indexOf(normalizeRarityBucket(b.rarity));
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
    return copy;
  }
  copy.sort((a, b) => {
    const [an, as] = cardNumberSortKey(a.number);
    const [bn, bs] = cardNumberSortKey(b.number);
    if (an !== bn) return an - bn;
    if (as !== bs) return as.localeCompare(bs);
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return copy;
}

type SetAccumulator = {
  set_id: string;
  set_name: string;
  symbol_url: string | null;
  logo_url: string | null;
  ownedCatalogIds: Set<string>;
  rarities: (string | null)[];
  variantEntries: { subtypes: string[] | null; rarity: string | null }[];
};

export function computeBinderInsightsFromRows(
  binder: {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
  },
  rows: BinderInsightCardRow[],
  setCatalogTotals: Map<string, number>
): BinderInsights {
  const catalogIds = new Set<string>();
  let lastUpdated: string | null = null;

  const setMap = new Map<string, SetAccumulator>();

  for (const row of rows) {
    if (row.updated_at) {
      if (!lastUpdated || row.updated_at > lastUpdated) lastUpdated = row.updated_at;
    }

    const cat = row.catalog;
    if (row.catalog_card_id) catalogIds.add(row.catalog_card_id);

    if (!cat?.set_id) continue;

    const setId = cat.set_id;
    let acc = setMap.get(setId);
    if (!acc) {
      acc = {
        set_id: setId,
        set_name: cat.set?.name?.trim() || "Unknown set",
        symbol_url: cat.set?.symbol_url ?? null,
        logo_url: cat.set?.logo_url ?? null,
        ownedCatalogIds: new Set(),
        rarities: [],
        variantEntries: [],
      };
      setMap.set(setId, acc);
    }

    if (row.catalog_card_id) acc.ownedCatalogIds.add(row.catalog_card_id);

    const rarity = cat.rarity ?? row.rarity;
    acc.rarities.push(rarity);
    acc.variantEntries.push({
      subtypes: cat.subtypes,
      rarity,
    });
  }

  const allRarities = rows.map((r) => r.catalog?.rarity ?? r.rarity);
  const allVariants = rows.map((r) => ({
    subtypes: r.catalog?.subtypes ?? null,
    rarity: r.catalog?.rarity ?? r.rarity,
  }));

  const rarity_distribution = buildRarityDistribution(allRarities);
  const variant_distribution = buildVariantDistribution(allVariants);
  const total_cards = rows.length;
  const unique_catalog_cards = catalogIds.size;

  const sets: BinderSetInsight[] = [...setMap.values()]
    .map((acc) => {
      const total = setCatalogTotals.get(acc.set_id) ?? 0;
      const owned = acc.ownedCatalogIds.size;
      const progress = computeSetCompletion(owned, total);
      return {
        set_id: acc.set_id,
        set_name: acc.set_name,
        symbol_url: acc.symbol_url,
        logo_url: acc.logo_url,
        progress,
        rarity_distribution: buildRarityDistribution(acc.rarities),
        variant_distribution: buildVariantDistribution(acc.variantEntries),
        missing_count: Math.max(0, total - owned),
      };
    })
    .sort((a, b) => a.set_name.localeCompare(b.set_name, undefined, { sensitivity: "base" }));

  return {
    overview: {
      binder_id: binder.id,
      name: binder.name,
      description: binder.description,
      created_at: binder.created_at,
      updated_at: lastUpdated,
      total_cards,
      unique_catalog_cards,
      sets_represented: sets.length,
    },
    rarity_distribution,
    variant_distribution,
    duplicate_count: Math.max(0, total_cards - unique_catalog_cards),
    total_variants: countNonStandardVariants(variant_distribution),
    sets,
  };
}

export function pickBinderDistribution(insights: BinderInsights): {
  rarity_distribution: BinderRarityDistribution;
  variant_distribution: VariantDistribution;
  duplicate_count: number;
  total_variants: number;
  total_cards: number;
  unique_catalog_cards: number;
} {
  return {
    rarity_distribution: insights.rarity_distribution,
    variant_distribution: insights.variant_distribution,
    duplicate_count: insights.duplicate_count,
    total_variants: insights.total_variants,
    total_cards: insights.overview.total_cards,
    unique_catalog_cards: insights.overview.unique_catalog_cards,
  };
}

async function fetchSetCatalogTotals(
  supabase: SupabaseClient<Database>,
  setIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (setIds.length === 0) return map;

  const results = await Promise.all(
    setIds.map(async (setId) => {
      const { count, error } = await supabase
        .from("catalog_cards")
        .select("id", { count: "exact", head: true })
        .eq("set_id", setId);
      return { setId, count: error ? 0 : (count ?? 0) };
    })
  );

  for (const { setId, count } of results) {
    map.set(setId, count);
  }
  return map;
}

export async function loadBinderInsightCards(
  supabase: SupabaseClient<Database>,
  binderId: string,
  userId: string
): Promise<{ binder: { id: string; name: string; description: string | null; created_at: string }; rows: BinderInsightCardRow[] } | null> {
  const { data: binder, error: binderErr } = await supabase
    .from("binders")
    .select("id, name, description, created_at")
    .eq("id", binderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (binderErr || !binder) return null;

  const { data: cards, error: cardsErr } = await supabase
    .from("cards")
    .select(
      `
      id,
      catalog_card_id,
      rarity,
      updated_at,
      catalog_cards (
        id,
        set_id,
        name,
        number,
        rarity,
        subtypes,
        image_small,
        catalog_sets (
          id,
          name,
          symbol_url,
          logo_url
        )
      )
    `
    )
    .eq("binder_id", binderId)
    .eq("user_id", userId);

  if (cardsErr) return null;

  return {
    binder: {
      id: binder.id,
      name: binder.name,
      description: binder.description,
      created_at: binder.created_at,
    },
    rows: mapCardRows((cards ?? []) as CardSelectRow[]),
  };
}

export async function getBinderInsights(
  supabase: SupabaseClient<Database>,
  binderId: string,
  userId: string
): Promise<BinderInsights | null> {
  const loaded = await loadBinderInsightCards(supabase, binderId, userId);
  if (!loaded) return null;

  const setIds = [
    ...new Set(
      loaded.rows
        .map((r) => r.catalog?.set_id)
        .filter((id): id is string => Boolean(id?.trim()))
    ),
  ];
  const setCatalogTotals = await fetchSetCatalogTotals(supabase, setIds);
  return computeBinderInsightsFromRows(loaded.binder, loaded.rows, setCatalogTotals);
}

export async function getBinderMissingCards(
  supabase: SupabaseClient<Database>,
  binderId: string,
  userId: string,
  options?: { setId?: string; sort?: MissingCardsSort }
): Promise<BinderMissingResult | null> {
  const insights = await getBinderInsights(supabase, binderId, userId);
  if (!insights) return null;

  const sort: MissingCardsSort = options?.sort ?? "number";
  const filterSetId = options?.setId?.trim() ?? "";

  const targetSets = filterSetId
    ? insights.sets.filter((s) => s.set_id === filterSetId)
    : insights.sets;

  if (filterSetId && targetSets.length === 0) {
    return { binder_id: binderId, sort, sets: [] };
  }

  const loaded = await loadBinderInsightCards(supabase, binderId, userId);
  if (!loaded) return null;

  const ownedBySet = new Map<string, Set<string>>();
  for (const row of loaded.rows) {
    const setId = row.catalog?.set_id;
    const cid = row.catalog_card_id;
    if (!setId || !cid) continue;
    let owned = ownedBySet.get(setId);
    if (!owned) {
      owned = new Set();
      ownedBySet.set(setId, owned);
    }
    owned.add(cid);
  }

  const sets: BinderMissingBySet[] = [];

  for (const setInsight of targetSets) {
    if (setInsight.missing_count <= 0) {
      sets.push({
        set_id: setInsight.set_id,
        set_name: setInsight.set_name,
        symbol_url: setInsight.symbol_url,
        logo_url: setInsight.logo_url,
        missing: [],
      });
      continue;
    }

    const owned = ownedBySet.get(setInsight.set_id) ?? new Set<string>();
    const { data: catalogRows, error } = await supabase
      .from("catalog_cards")
      .select("id, set_id, name, number, rarity, image_small")
      .eq("set_id", setInsight.set_id);

    if (error) continue;

    const missing: BinderMissingCard[] = (catalogRows ?? [])
      .filter((c) => !owned.has(c.id))
      .map((c) => ({
        catalog_card_id: c.id,
        set_id: setInsight.set_id,
        set_name: setInsight.set_name,
        name: c.name,
        number: c.number ?? "—",
        rarity: c.rarity,
        image_small: c.image_small,
      }));

    sets.push({
      set_id: setInsight.set_id,
      set_name: setInsight.set_name,
      symbol_url: setInsight.symbol_url,
      logo_url: setInsight.logo_url,
      missing: sortMissingCards(missing, sort),
    });
  }

  return { binder_id: binderId, sort, sets };
}
