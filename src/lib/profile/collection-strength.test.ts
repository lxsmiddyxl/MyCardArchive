import { describe, expect, it } from "vitest";
import { collectionStrengthCategory } from "@/lib/profile/collection-strength";

describe("collection strength (Phase 84)", () => {
  it("returns emerging for sparse collections", () => {
    expect(collectionStrengthCategory({
      uniqueCards: 10,
      binderCount: 1,
      showcaseCount: 0,
      tradesCompleted: 0,
      rarityScore: 0.1,
    }).category).toBe("emerging");
  });

  it("returns elite for deep collections", () => {
    expect(collectionStrengthCategory({
      uniqueCards: 600,
      binderCount: 15,
      showcaseCount: 8,
      tradesCompleted: 40,
      rarityScore: 0.9,
    }).category).toBe("elite");
  });
});
