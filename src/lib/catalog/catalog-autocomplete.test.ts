import { describe, expect, it } from "vitest";
import {
  catalogDetailToSelection,
  catalogHitToSelection,
  isCatalogFormLocked,
} from "@/lib/catalog/catalog-form-hydration";
import {
  buildCatalogSearchUrl,
  CATALOG_AUTOCOMPLETE_DEBOUNCE_MS,
  CATALOG_AUTOCOMPLETE_LIMIT,
  normalizeCatalogSearchHit,
  parseCatalogSearchResults,
} from "@/lib/catalog/search";

describe("catalog autocomplete (manual add)", () => {
  it("builds search URL with query alias and limit 10", () => {
    const url = buildCatalogSearchUrl("pikachu", { setId: "base1" });
    expect(url).toContain("query=pikachu");
    expect(url).toContain(`limit=${CATALOG_AUTOCOMPLETE_LIMIT}`);
    expect(url).toContain("set_id=base1");
  });

  it("uses debounce window in recommended range", () => {
    expect(CATALOG_AUTOCOMPLETE_DEBOUNCE_MS).toBeGreaterThanOrEqual(150);
    expect(CATALOG_AUTOCOMPLETE_DEBOUNCE_MS).toBeLessThanOrEqual(250);
  });

  it("parses catalog search results", () => {
    const hits = parseCatalogSearchResults({
      results: [
        {
          id: "xy1-42",
          name: "Pikachu",
          set: "XY",
          number: "42",
          rarity: "Common",
          image_url: "https://example.com/p.png",
          supertype: "Pokémon",
          subtypes: ["Basic"],
        },
      ],
    });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.name).toBe("Pikachu");
  });

  it("hydrates form selection from catalog hit", () => {
    const hit = normalizeCatalogSearchHit({
      id: "xy1-42",
      name: "Pikachu",
      set: "XY",
      set_id: "xy1",
      number: "42",
      rarity: "Common",
      supertype: "Pokémon",
      subtypes: ["Basic"],
    });
    expect(hit).not.toBeNull();
    const sel = catalogHitToSelection(hit!);
    expect(sel.catalogCardId).toBe("xy1-42");
    expect(sel.setId).toBe("xy1");
    expect(sel.type).toBe("Pokémon");
  });

  it("hydrates from catalog detail row", () => {
    const sel = catalogDetailToSelection({
      id: "sv1-25",
      name: "Charizard",
      number: "25",
      rarity: "Rare",
      set_id: "sv1",
      supertype: "Pokémon",
      subtypes: ["Stage 2"],
      image_small: null,
      image_large: "https://example.com/c.png",
      catalog_sets: { name: "Scarlet & Violet" },
    });
    expect(sel.setName).toBe("Scarlet & Violet");
    expect(sel.tcgplayerId).toBe("sv1-25");
  });

  it("locks form when catalog selected until manual edit", () => {
    const sel = catalogHitToSelection({
      id: "a",
      name: "A",
      set: "S",
      number: "1",
      rarity: null,
      image_url: null,
    });
    expect(isCatalogFormLocked(sel, false)).toBe(true);
    expect(isCatalogFormLocked(sel, true)).toBe(false);
    expect(isCatalogFormLocked(null, false)).toBe(false);
  });
});
