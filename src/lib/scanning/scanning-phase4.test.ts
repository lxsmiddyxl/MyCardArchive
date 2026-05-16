import { describe, expect, it } from "vitest";
import {
  computeTargetDimensions,
  shouldCompressScanFile,
  SCAN_MAX_EDGE_PX,
} from "@/mca-utils/scan/imageCompression";
import {
  variantBadgeFromGroup,
  variantBadgeFromHit,
  variantBadgeInitials,
} from "@/mca-utils/scan/variant-badge";
import { rankScanCandidates } from "@/lib/scanning/phase3/rank-candidates";
import { hydrateFromRankedCandidate } from "@/mca-utils/catalog/hydrateCardMetadata";
import { computeSetCompletion } from "@/lib/catalog/set-progress";
import { flushPendingScans } from "@/mca-utils/offline/flush-pending-scans";
import { enqueuePendingScan, removePendingScan } from "@/mca-utils/offline/cache";

describe("scanning phase 4", () => {
  it("downscales dimensions beyond max edge", () => {
    const d = computeTargetDimensions(3200, 2400, SCAN_MAX_EDGE_PX);
    expect(Math.max(d.width, d.height)).toBe(SCAN_MAX_EDGE_PX);
  });

  it("flags large files for compression", () => {
    const small = { size: 100_000, type: "image/jpeg" } as File;
    const large = { size: 2_000_000, type: "image/png" } as File;
    expect(shouldCompressScanFile(small)).toBe(false);
    expect(shouldCompressScanFile(large)).toBe(true);
  });

  it("derives variant badges for scan results", () => {
    expect(variantBadgeFromGroup("reverse_holo")).toBe("Reverse");
    expect(variantBadgeFromGroup("standard")).toBeNull();
    const fromHit = variantBadgeFromHit({
      id: "x",
      name: "Pikachu",
      set: "Base",
      number: "58",
      rarity: "Rare Holo",
      image_url: null,
      subtypes: ["Reverse Holo"],
    });
    expect(fromHit).toBeTruthy();
    expect(variantBadgeInitials("Promo")).toBe("PR");
  });

  it("ranks candidates for binder set progress input", () => {
    const ranking = rankScanCandidates({
      autoMatch: {
        matches: [
          {
            card_name: "Mew",
            set_name: "151",
            number: "151",
            rarity: "Rare",
            image_url: "https://example.com/mew.jpg",
            confidence: 0.8,
            catalog_card_id: "c1",
            set_id: "sv3",
          },
        ],
        best_match: null,
      },
      gray: null,
      nameQuery: "Mew",
      numberPasses: [],
    });
    expect(ranking.topCandidate?.image_url).toContain("mew");
    const meta = hydrateFromRankedCandidate(ranking.topCandidate!);
    expect(meta.catalog_card_id).toBe("c1");
    const progress = computeSetCompletion(12, 200);
    expect(progress.owned).toBe(12);
    expect(progress.total).toBe(200);
  });

  it("queues offline scans and skips flush when offline", async () => {
    const id = await enqueuePendingScan({
      imageBase64: "YQ==",
      mimeType: "image/jpeg",
    });
    const prev = globalThis.navigator;
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      configurable: true,
    });
    const r = await flushPendingScans();
    expect(r.synced).toBe(0);
    Object.defineProperty(globalThis, "navigator", { value: prev, configurable: true });
    await removePendingScan(id);
  });
});
