import { buildRarityDistribution } from "@/lib/catalog/binder-rarity-hints";
import {
  buildVariantDistribution,
  normalizeVariantBucket,
} from "@/lib/catalog/variant-distribution";
import { computeSetCompletion } from "@/lib/catalog/set-progress";
import type { BinderInsightCardRow } from "@/mca-utils/binders/binder-insights-types";
import {
  cardNumberSortKey,
  computeBinderInsightsFromRows,
  pickBinderDistribution,
  sortMissingCards,
} from "@/mca-utils/binders/getBinderInsights";
import { describe, expect, it } from "vitest";

function row(
  partial: Partial<BinderInsightCardRow> & { id: string; catalog_card_id: string | null }
): BinderInsightCardRow {
  return {
    rarity: null,
    updated_at: "2026-01-01T00:00:00Z",
    catalog: null,
    ...partial,
  };
}

describe("binder upgrade phase 1 — insights", () => {
  it("computes overview metrics and duplicate count", () => {
    const cards: BinderInsightCardRow[] = [
      row({
        id: "1",
        catalog_card_id: "c1",
        catalog: {
          id: "c1",
          set_id: "set-a",
          name: "Pikachu",
          number: "25",
          rarity: "Common",
          subtypes: [],
          image_small: null,
          set: { id: "set-a", name: "Base", symbol_url: null, logo_url: null },
        },
      }),
      row({
        id: "2",
        catalog_card_id: "c1",
        updated_at: "2026-02-01T00:00:00Z",
        catalog: {
          id: "c1",
          set_id: "set-a",
          name: "Pikachu",
          number: "25",
          rarity: "Common",
          subtypes: [],
          image_small: null,
          set: { id: "set-a", name: "Base", symbol_url: null, logo_url: null },
        },
      }),
      row({
        id: "3",
        catalog_card_id: "c2",
        catalog: {
          id: "c2",
          set_id: "set-b",
          name: "Charizard",
          number: "4",
          rarity: "Rare Holo",
          subtypes: ["Holo"],
          image_small: null,
          set: { id: "set-b", name: "Jungle", symbol_url: null, logo_url: null },
        },
      }),
    ];

    const totals = new Map([
      ["set-a", 10],
      ["set-b", 5],
    ]);

    const insights = computeBinderInsightsFromRows(
      {
        id: "binder-1",
        name: "My binder",
        description: null,
        created_at: "2025-01-01T00:00:00Z",
      },
      cards,
      totals
    );

    expect(insights.overview.total_cards).toBe(3);
    expect(insights.overview.unique_catalog_cards).toBe(2);
    expect(insights.overview.sets_represented).toBe(2);
    expect(insights.overview.updated_at).toBe("2026-02-01T00:00:00Z");
    expect(insights.duplicate_count).toBe(1);
    expect(insights.sets).toHaveLength(2);
    expect(insights.sets[0]!.set_name).toBe("Base");
    expect(insights.sets[0]!.progress).toEqual(computeSetCompletion(1, 10));
    expect(insights.sets[0]!.missing_count).toBe(9);
  });

  it("builds set progress with unique owned catalog ids", () => {
    const totals = new Map([["set-a", 3]]);
    const insights = computeBinderInsightsFromRows(
      { id: "b", name: "B", description: null, created_at: "2025-01-01T00:00:00Z" },
      [
        row({ id: "1", catalog_card_id: "c1", catalog: { id: "c1", set_id: "set-a", name: "A", number: "1", rarity: "Common", subtypes: [], image_small: null, set: { id: "set-a", name: "Set A", symbol_url: null, logo_url: null } } }),
        row({ id: "2", catalog_card_id: "c1", catalog: { id: "c1", set_id: "set-a", name: "A", number: "1", rarity: "Common", subtypes: [], image_small: null, set: { id: "set-a", name: "Set A", symbol_url: null, logo_url: null } } }),
      ],
      totals
    );
    expect(insights.sets[0]!.progress.owned).toBe(1);
    expect(insights.sets[0]!.progress.percent).toBe(33);
  });

  it("sorts missing cards by number, rarity, and name", () => {
    const missing = [
      {
        catalog_card_id: "a",
        set_id: "s",
        set_name: "S",
        name: "Zard",
        number: "10",
        rarity: "Rare",
        image_small: null,
      },
      {
        catalog_card_id: "b",
        set_id: "s",
        set_name: "S",
        name: "Bee",
        number: "2",
        rarity: "Common",
        image_small: null,
      },
      {
        catalog_card_id: "c",
        set_id: "s",
        set_name: "S",
        name: "Abra",
        number: "63",
        rarity: "Uncommon",
        image_small: null,
      },
    ];

    const byNumber = sortMissingCards(missing, "number");
    expect(byNumber.map((c) => c.catalog_card_id)).toEqual(["b", "a", "c"]);

    const byRarity = sortMissingCards(missing, "rarity");
    expect(byRarity[0]!.catalog_card_id).toBe("b");

    const byName = sortMissingCards(missing, "name");
    expect(byName.map((c) => c.name)).toEqual(["Abra", "Bee", "Zard"]);
  });

  it("parses card numbers for sort keys", () => {
    expect(cardNumberSortKey("25/102")[0]).toBe(25);
    expect(cardNumberSortKey("#003")[0]).toBe(3);
    expect(cardNumberSortKey("—")[0]).toBe(999_999);
  });

  it("aggregates rarity and variant distribution", () => {
    const rarities = ["Common", "Rare Holo", "Secret Rare"];
    const dist = buildRarityDistribution(rarities);
    expect(dist.common).toBe(1);
    expect(dist.rare).toBe(1);
    expect(dist.secret).toBe(1);

    expect(normalizeVariantBucket(["Reverse Holo"], "Rare")).toBe("reverse");
    expect(normalizeVariantBucket([], "Rare Holo V")).toBe("holo");

    const variants = buildVariantDistribution([
      { subtypes: [], rarity: "Common" },
      { subtypes: ["Reverse Holo"], rarity: "Uncommon" },
    ]);
    expect(variants.standard).toBe(1);
    expect(variants.reverse).toBe(1);
  });

  it("pickBinderDistribution exposes analytics slice", () => {
    const totals = new Map<string, number>();
    const insights = computeBinderInsightsFromRows(
      { id: "b", name: "B", description: null, created_at: "2025-01-01T00:00:00Z" },
      [],
      totals
    );
    const slice = pickBinderDistribution(insights);
    expect(slice.duplicate_count).toBe(0);
    expect(slice.total_variants).toBe(0);
    expect(slice.rarity_distribution.common).toBe(0);
  });
});

describe("binder upgrade phase 1 — API route modules", () => {
  it("defines GET handlers for binder insight routes", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const root = path.join(process.cwd(), "src/app/api/binders/[binderId]");
    const routes: Record<string, string> = {
      sets: "getBinderInsights",
      missing: "getBinderMissingCards",
      distribution: "getBinderInsights",
      insights: "getBinderInsights",
    };
    for (const [segment, needle] of Object.entries(routes)) {
      const file = path.join(root, segment, "route.ts");
      const src = await fs.readFile(file, "utf8");
      expect(src).toContain("export const GET");
      expect(src).toContain(needle);
    }
  });
});
