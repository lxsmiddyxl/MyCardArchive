import { describe, expect, it } from "vitest";
import { resolveBinderAccent } from "@/lib/binders/binder-accent";
import {
  buildRarityDistribution,
  isRareForBinder,
  normalizeRarityBucket,
} from "@/lib/catalog/binder-rarity-hints";
import { catalogHitMatchesNumber, computeSetCompletion } from "@/lib/catalog/set-progress";
import { incrementCollectorNumber } from "@/lib/catalog/next-in-set";
import { variantLabelFromHit } from "@/lib/catalog/variants";
import { catalogSearchCacheKey } from "@/mca-utils/offline/cache";
import { flushPendingCardAdds } from "@/mca-utils/offline/flush-pending-card-adds";
import { catalogMatchConfidenceLabel, resolveCatalogMatchConfidence } from "@/mca-utils/catalog/confidence";

describe("manual add autocomplete phase 4", () => {
  it("builds variant labels with holo hints", () => {
    const label = variantLabelFromHit({
      id: "a",
      name: "Pikachu",
      set: "Base",
      number: "58",
      rarity: "Rare Holo",
      image_url: null,
      subtypes: ["Reverse Holo"],
    });
    expect(label.toLowerCase()).toContain("reverse");
  });

  it("computes set completion percent", () => {
    expect(computeSetCompletion(45, 100).percent).toBe(45);
    expect(computeSetCompletion(45, 100).owned).toBe(45);
  });

  it("matches catalog hit by collector number stem", () => {
    const id = catalogHitMatchesNumber(
      [
        { id: "x1", number: "121/198" },
        { id: "x2", number: "122/198" },
      ],
      "122"
    );
    expect(id).toBe("x2");
  });

  it("increments number for next-in-set navigation", () => {
    expect(incrementCollectorNumber("121/198")).toBe("122/198");
  });

  it("detects rare-for-binder from distribution", () => {
    const dist = buildRarityDistribution(
      Array.from({ length: 20 }, () => "Common").concat(["Rare Holo", "Rare Holo"])
    );
    expect(isRareForBinder("Secret Rare", dist)).toBe(true);
    expect(normalizeRarityBucket("Secret Rare")).toBe("secret");
  });

  it("resolves binder accent from id when no stored color", () => {
    const a = resolveBinderAccent("binder-abc-123");
    expect(a.color).toMatch(/^#/);
    expect(a.borderClass).toBeTruthy();
  });

  it("uses stored hex color when provided", () => {
    const a = resolveBinderAccent("b1", "#ff00aa");
    expect(a.color).toBe("#ff00aa");
  });

  it("exposes accessible confidence labels", () => {
    const { band } = resolveCatalogMatchConfidence({
      query: "121/088",
      hit: {
        id: "x",
        name: "Mew",
        set: "151",
        number: "121/088",
        rarity: "Ultra Rare",
        image_url: null,
      },
      searchMode: "number",
      autoDetected: true,
    });
    expect(catalogMatchConfidenceLabel(band).length).toBeGreaterThan(3);
  });

  it("builds catalog search cache keys", () => {
    expect(catalogSearchCacheKey("pikachu", "name")).toContain("pikachu");
  });

  it("flush returns empty when offline", async () => {
    const prev = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      configurable: true,
    });
    const r = await flushPendingCardAdds();
    expect(r.synced).toBe(0);
    Object.defineProperty(globalThis, "navigator", { value: prev, configurable: true });
  });
});
