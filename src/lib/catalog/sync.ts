import type { Database } from "@/lib/supabase/types";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type CatalogSyncResult = {
  ok: boolean;
  upserted: number;
  error?: string;
  skipped?: boolean;
};

/**
 * Mock Pokémon TCG API payloads (replace with `fetch('https://api.pokemontcg.io/v2/...')`).
 */
function mockSetsRows(): Database["public"]["Tables"]["catalog_sets"]["Insert"][] {
  return [
    {
      id: "sv1",
      name: "Scarlet & Violet Base Set",
      series: "Scarlet & Violet",
      printed_total: 198,
      total: 258,
      release_date: "2023-03-31",
      symbol_url: "https://images.pokemontcg.io/sv1/symbol.png",
      logo_url: "https://images.pokemontcg.io/sv1/logo.png",
    },
    {
      id: "sv3",
      name: "Obsidian Flames",
      series: "Scarlet & Violet",
      printed_total: 197,
      total: 230,
      release_date: "2023-08-11",
      symbol_url: "https://images.pokemontcg.io/sv3/symbol.png",
      logo_url: "https://images.pokemontcg.io/sv3/logo.png",
    },
  ];
}

function mockCardsRows(
  setId: string
): Database["public"]["Tables"]["catalog_cards"]["Insert"][] {
  const bySet: Record<
    string,
    Database["public"]["Tables"]["catalog_cards"]["Insert"][]
  > = {
    sv1: [
      {
        id: "sv1-1",
        set_id: "sv1",
        name: "Bulbasaur",
        number: "1",
        rarity: "Common",
        supertype: "Pokémon",
        subtypes: ["Basic"],
        image_small: "https://images.pokemontcg.io/sv1/1.png",
        image_large: "https://images.pokemontcg.io/sv1/1_hires.png",
      },
      {
        id: "sv1-27",
        set_id: "sv1",
        name: "Pikachu",
        number: "27",
        rarity: "Rare",
        supertype: "Pokémon",
        subtypes: ["Basic"],
        image_small: "https://images.pokemontcg.io/sv1/27.png",
        image_large: "https://images.pokemontcg.io/sv1/27_hires.png",
      },
      {
        id: "sv1-168",
        set_id: "sv1",
        name: "Squirtle",
        number: "168",
        rarity: "Illustration Rare",
        supertype: "Pokémon",
        subtypes: ["Basic"],
        image_small: "https://images.pokemontcg.io/sv1/168.png",
        image_large: "https://images.pokemontcg.io/sv1/168_hires.png",
      },
    ],
    sv3: [
      {
        id: "sv3-125",
        set_id: "sv3",
        name: "Charmander",
        number: "125",
        rarity: "Common",
        supertype: "Pokémon",
        subtypes: ["Basic"],
        image_small: "https://images.pokemontcg.io/sv3/125.png",
        image_large: "https://images.pokemontcg.io/sv3/125_hires.png",
      },
    ],
  };
  return bySet[setId] ?? [];
}

/**
 * Upserts mock / future API-loaded sets. Never throws.
 */
export async function syncCatalogSets(): Promise<CatalogSyncResult> {
  try {
    const admin = createServiceRoleClient();
    if (!admin) {
      return {
        ok: false,
        upserted: 0,
        skipped: true,
        error: "SUPABASE_SERVICE_ROLE_KEY not configured",
      };
    }
    const rows = mockSetsRows();
    const { error } = await admin.from("catalog_sets").upsert(rows, {
      onConflict: "id",
    });
    if (error) {
      return { ok: false, upserted: 0, error: error.message };
    }
    return { ok: true, upserted: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    return { ok: false, upserted: 0, error: msg };
  }
}

/**
 * Upserts mock / future API-loaded cards for a single set id.
 * Never throws.
 */
export async function syncCatalogCardsForSet(
  setId: string
): Promise<CatalogSyncResult> {
  try {
    const sid = setId?.trim();
    if (!sid) {
      return { ok: false, upserted: 0, error: "invalid_set_id" };
    }
    const admin = createServiceRoleClient();
    if (!admin) {
      return {
        ok: false,
        upserted: 0,
        skipped: true,
        error: "SUPABASE_SERVICE_ROLE_KEY not configured",
      };
    }
    const rows = mockCardsRows(sid);
    if (rows.length === 0) {
      return { ok: true, upserted: 0, error: "no_mock_cards_for_set" };
    }
    const { error } = await admin.from("catalog_cards").upsert(rows, {
      onConflict: "id",
    });
    if (error) {
      return { ok: false, upserted: 0, error: error.message };
    }
    return { ok: true, upserted: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sync_failed";
    return { ok: false, upserted: 0, error: msg };
  }
}
