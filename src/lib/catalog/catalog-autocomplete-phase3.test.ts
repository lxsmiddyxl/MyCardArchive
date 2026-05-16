import { describe, expect, it } from "vitest";
import {
  catalogMatchConfidenceBand,
  resolveCatalogMatchConfidence,
  scoreCatalogMatch,
} from "@/mca-utils/catalog/confidence";
import {
  findMultiVariantGroups,
  variantLabelFromHit,
} from "@/lib/catalog/variants";
import { incrementCollectorNumber, buildNextInSetAddCardUrl } from "@/lib/catalog/next-in-set";
import { catalogFormSelectionToPanelData } from "@/mca-utils/catalog/hydrateCardMetadata";
import { catalogSearchCacheKey } from "@/mca-utils/offline/catalog-search-cache";
import {
  enqueuePendingCardAdd,
  listPendingCardAdds,
  removePendingCardAdd,
} from "@/mca-utils/offline/cache";

describe("manual add autocomplete phase 3", () => {
  it("scores high confidence on exact number match", () => {
    const score = scoreCatalogMatch({
      query: "121/088",
      hit: {
        id: "x",
        name: "Mew ex",
        set: "151",
        set_id: "sv3pt5",
        number: "121/088",
        rarity: "Ultra Rare",
        image_url: null,
      },
      searchMode: "number",
      autoDetected: true,
    });
    expect(catalogMatchConfidenceBand(score)).toBe("high");
  });

  it("scores lower confidence on weak name overlap", () => {
    const score = scoreCatalogMatch({
      query: "zzz",
      hit: {
        id: "x",
        name: "Pikachu",
        set: "Base",
        number: "58",
        rarity: null,
        image_url: null,
      },
      searchMode: "name",
    });
    expect(score).toBeLessThan(0.5);
  });

  it("groups catalog variants by name and number", () => {
    const base = {
      name: "Charizard",
      set_id: "sv3",
      set: "Obsidian Flames",
      number: "125",
      image_url: null,
    };
    const groups = findMultiVariantGroups([
      { ...base, id: "a", rarity: "Rare Holo", subtypes: ["Holo"] },
      { ...base, id: "b", rarity: "Reverse Holo", subtypes: ["Reverse Holo"] },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.variants).toHaveLength(2);
    expect(variantLabelFromHit(groups[0]!.variants[1]!)).toContain("Reverse");
  });

  it("increments collector numbers for next-in-set navigation", () => {
    expect(incrementCollectorNumber("121/198")).toBe("122/198");
    expect(buildNextInSetAddCardUrl({
      binderId: "b1",
      setId: "sv3",
      number: "10",
    })).toContain("next_in_set=1");
  });

  it("maps form selection to unified panel data", () => {
    const data = catalogFormSelectionToPanelData({
      catalogCardId: "sv3-102",
      name: "Gardevoir ex",
      number: "102",
      rarity: "Double Rare",
      setId: "sv3",
      setName: "Obsidian Flames",
      imageUrl: "https://example.com/g.png",
      supertype: "Pokémon",
      subtypes: ["Basic"],
      type: "Pokémon",
      tcgplayerId: "sv3-102",
    });
    expect(data.setName).toBe("Obsidian Flames");
    expect(data.imageUrl).toContain("example.com");
  });

  it("builds stable catalog search cache keys", () => {
    expect(catalogSearchCacheKey("pikachu", "name", "sv1")).toBe("name|sv1|pikachu");
  });

  it("queues offline pending card adds in IndexedDB", async () => {
    const id = await enqueuePendingCardAdd("binder-1", { name: "Test", binder_id: "binder-1" });
    expect(id.length).toBeGreaterThan(0);
    const rows = await listPendingCardAdds();
    expect(rows.some((r) => r.id === id)).toBe(true);
    await removePendingCardAdd(id);
    expect((await listPendingCardAdds()).some((r) => r.id === id)).toBe(false);
  });

  it("resolves confidence bands for number search", () => {
    const { band } = resolveCatalogMatchConfidence({
      query: "4/102",
      hit: {
        id: "base4-4",
        name: "Charizard",
        set: "Base Set 2",
        number: "4/102",
        rarity: "Rare",
        image_url: null,
      },
      searchMode: "number",
    });
    expect(["high", "medium", "low"]).toContain(band);
  });
});
