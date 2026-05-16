import { describe, expect, it } from "vitest";
import { sortCatalogHitsByNumber } from "@/lib/catalog/catalog-rows";
import {
  catalogDetailToSelection,
  catalogHitToSelection,
} from "@/lib/catalog/catalog-form-hydration";
import {
  buildCatalogSearchUrlForMode,
  parseCatalogSearchResults,
} from "@/lib/catalog/search";
import {
  buildSuggestionGroups,
  shouldLoadSuggestions,
} from "@/lib/catalog/suggestions";
import {
  classifyCatalogQuery,
  isAutoDetectNumberQuery,
  parseNumberQuery,
} from "@/lib/catalog/search-modes";
import {
  hydrateFromCatalogHit,
  hydrateFromScanBestMatch,
  toAddCardPrefillPayload,
} from "@/mca-utils/catalog/hydrateCardMetadata";

describe("manual add autocomplete phase 2", () => {
  it("classifies set-first queries", () => {
    expect(classifyCatalogQuery("151")).toBe("set");
    expect(classifyCatalogQuery("SV2")).toBe("set");
    expect(classifyCatalogQuery("Crown Zenith")).toBe("set");
  });

  it("classifies number-first queries", () => {
    expect(classifyCatalogQuery("121/088")).toBe("number");
    expect(classifyCatalogQuery("4/102")).toBe("number");
    expect(classifyCatalogQuery("SV3 102")).toBe("number");
    expect(classifyCatalogQuery("102")).toBe("number");
  });

  it("parses number patterns", () => {
    expect(parseNumberQuery("121/088")).toEqual({
      raw: "121/088",
      number: "121/088",
      fractionTotal: "088",
    });
    expect(parseNumberQuery("SV3 102")).toMatchObject({
      setCode: "SV3",
      number: "102",
    });
  });

  it("builds mode-specific search URLs", () => {
    expect(buildCatalogSearchUrlForMode("set", "151")).toContain("/api/catalog/search/set");
    expect(buildCatalogSearchUrlForMode("number", "4/102")).toContain(
      "/api/catalog/search/number"
    );
    expect(buildCatalogSearchUrlForMode("name", "pikachu")).toContain("/api/catalog/search?");
  });

  it("flags auto-detect number patterns", () => {
    expect(isAutoDetectNumberQuery("121/088")).toBe(true);
    expect(isAutoDetectNumberQuery("pikachu")).toBe(false);
  });

  it("sorts catalog hits by collector number", () => {
    const sorted = sortCatalogHitsByNumber([
      { id: "b", name: "B", set: "S", number: "10", rarity: null, image_url: null },
      { id: "a", name: "A", set: "S", number: "2", rarity: null, image_url: null },
    ]);
    expect(sorted[0]?.number).toBe("2");
  });

  it("unified hydration matches form selection", () => {
    const hit = {
      id: "sv3-102",
      name: "Gardevoir ex",
      set: "Obsidian Flames",
      set_id: "sv3",
      number: "102",
      rarity: "Double Rare",
      image_url: "https://example.com/g.png",
      supertype: "Pokémon",
      subtypes: ["Basic"],
    };
    const meta = hydrateFromCatalogHit(hit);
    const sel = catalogHitToSelection(hit);
    expect(sel.catalogCardId).toBe(meta.catalog_card_id);
    expect(sel.setId).toBe(meta.setId);
    expect(sel.name).toBe(meta.name);
  });

  it("hydrates scan best match for prefill", () => {
    const payload = toAddCardPrefillPayload(
      hydrateFromScanBestMatch({
        card_name: "Pikachu",
        set_name: "Base",
        number: "58",
        rarity: "Common",
        image_url: "https://example.com/p.png",
        catalog_card_id: "base1-58",
        confidence: 0.9,
      })
    );
    expect(payload.catalog_card_id).toBe("base1-58");
    expect(payload.set_name).toBe("Base");
  });

  it("builds suggestion groups and dedupes", () => {
    const hit = {
      id: "x",
      name: "X",
      set: "S",
      number: "1",
      rarity: null,
      image_url: null,
    };
    const groups = buildSuggestionGroups({
      binderRecent: [hit],
      globalRecent: [hit],
      nearby: [],
      bySet: [hit],
      selectedId: "x",
    });
    expect(groups.every((g) => g.hits.every((h) => h.id !== "x"))).toBe(true);
  });

  it("loads suggestions when binder is known", () => {
    expect(shouldLoadSuggestions({ binderId: "b1" })).toBe(true);
    expect(shouldLoadSuggestions({ binderId: "" })).toBe(false);
  });

  it("parses empty search results as fallback", () => {
    expect(parseCatalogSearchResults({ results: [] })).toEqual([]);
  });

  it("hydrates catalog detail via unified pipeline", () => {
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
  });
});
