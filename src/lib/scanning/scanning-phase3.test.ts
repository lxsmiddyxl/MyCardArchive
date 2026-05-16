import { describe, expect, it } from "vitest";
import { detectVariantHints } from "@/mca-utils/scan/variantDetection";
import { classifySetSymbol } from "@/mca-utils/scan/setSymbolClassifier";
import {
  mergeNumberFallbackPasses,
  numberMatchScore,
  normalizeNumberStem,
} from "@/mca-utils/scan/numberFallback";
import { detectCardRegions } from "@/mca-utils/scan/regionDetection";
import type { GrayImage } from "@/mca-utils/scan/imageGray";
import { rankScanCandidates } from "@/lib/scanning/phase3/rank-candidates";
import { rankingFromAutoMatch } from "@/lib/scanning/phase3/fallback-ranking";
import { hydrateFromRankedCandidate } from "@/mca-utils/catalog/hydrateCardMetadata";
import { flushPendingScans } from "@/mca-utils/offline/flush-pending-scans";
import {
  enqueuePendingScan,
  listPendingScans,
  removePendingScan,
} from "@/mca-utils/offline/cache";

function mockGray(w = 100, h = 140): GrayImage {
  const data = new Uint8Array(w * h);
  for (let i = 0; i < data.length; i++) {
    data[i] = 80 + (i % 40);
  }
  return { data, width: w, height: h };
}

describe("scanning phase 3", () => {
  it("detects variant hints from grayscale art region", () => {
    const hints = detectVariantHints(mockGray());
    expect(hints.variantGroup).toBeTruthy();
    expect(hints.holoShine).toBeGreaterThanOrEqual(0);
  });

  it("classifies set symbol candidates", () => {
    const c = classifySetSymbol(mockGray(), ["sv1", "sv2"]);
    expect(c.length).toBeGreaterThan(0);
    expect(c[0]?.setId).toBe("sv1");
  });

  it("merges number OCR fallback passes", () => {
    const stem = mergeNumberFallbackPasses([
      { label: "zoom", number: "121/198", weight: 1 },
      { label: "edge", number: "121", weight: 0.8 },
    ]);
    expect(normalizeNumberStem(stem)).toBe("121");
    expect(numberMatchScore("121/198", stem)).toBe(1);
  });

  it("detects card regions in a grid", () => {
    const regions = detectCardRegions(mockGray(300, 400), 9);
    expect(regions.length).toBeGreaterThan(0);
    expect(regions[0]?.score).toBeGreaterThan(0);
  });

  it("ranks candidates with top and secondary lists", () => {
    const ranking = rankScanCandidates({
      autoMatch: {
        matches: [
          {
            card_name: "Pikachu",
            set_name: "Base",
            number: "58",
            rarity: "Common",
            image_url: null,
            confidence: 0.6,
            catalog_card_id: "c1",
          },
          {
            card_name: "Raichu",
            set_name: "Base",
            number: "14",
            rarity: "Rare",
            image_url: null,
            confidence: 0.5,
            catalog_card_id: "c2",
          },
        ],
        best_match: null,
      },
      gray: mockGray(),
      nameQuery: "Pikachu",
      numberPasses: [{ label: "primary", number: "58", weight: 1 }],
    });
    expect(ranking.topCandidate?.catalog_card_id).toBeTruthy();
    expect(ranking.allCandidates.length).toBe(2);
  });

  it("builds fallback ranking from legacy auto_match", () => {
    const r = rankingFromAutoMatch({
      matches: [
        {
          card_name: "Mew",
          set_name: "151",
          number: "151",
          rarity: "Rare",
          image_url: null,
          confidence: 0.9,
          catalog_card_id: "x",
        },
      ],
      best_match: null,
    });
    expect(r.topCandidate?.card_name).toBe("Mew");
  });

  it("hydrates ranked candidate for card create body", () => {
    const meta = hydrateFromRankedCandidate({
      card_name: "Charizard",
      set_name: "Base",
      number: "4",
      rarity: "Rare Holo",
      image_url: "https://example.com/4.jpg",
      confidence: 0.9,
      catalog_card_id: "z",
      variantGroup: "holo",
      setSymbolScore: 0.5,
      ocrNumberScore: 1,
      fuzzyNameScore: 0.8,
      imageSimilarityScore: 0.4,
    });
    expect(meta.catalog_card_id).toBe("z");
    expect(meta.name).toBe("Charizard");
  });

  it("queues and flushes offline scans", async () => {
    const id = await enqueuePendingScan({
      imageBase64: "YQ==",
      mimeType: "image/jpeg",
    });
    expect((await listPendingScans()).some((r) => r.id === id)).toBe(true);
    const prev = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      configurable: true,
    });
    const off = await flushPendingScans();
    expect(off.synced).toBe(0);
    Object.defineProperty(globalThis, "navigator", { value: prev, configurable: true });
    await removePendingScan(id);
  });
});
