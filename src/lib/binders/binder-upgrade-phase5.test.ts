import { computeBinderBadges, aggregateProfileStats } from "@/lib/binders/profile-stats";
import { parseProfileTheme } from "@/lib/binders/portfolio-types";
import { buildBinderExportHtml } from "@/mca-utils/binders/exportHtml";
import { describe, expect, it } from "vitest";

describe("binder upgrade phase 5 — profile theme", () => {
  it("parses profile themes", () => {
    expect(parseProfileTheme("holo")).toBe("holo");
    expect(parseProfileTheme("dark")).toBe("dark");
    expect(parseProfileTheme(null)).toBe("color");
  });
});

describe("binder upgrade phase 5 — badges and stats", () => {
  it("awards milestone badges", () => {
    const badges = computeBinderBadges({
      total_cards: 120,
      sets_represented: 6,
      binder_count: 4,
      max_set_percent: 80,
    });
    expect(badges).toContain("Century collector");
    expect(badges).toContain("Set explorer");
    expect(badges).toContain("Multi-binder");
    expect(badges).toContain("Near complete");
  });

  it("aggregates profile stats across binders", () => {
    const stats = aggregateProfileStats({
      binderCount: 2,
      insightsList: [
        {
          overview: {
            binder_id: "a",
            name: "A",
            description: null,
            created_at: "",
            updated_at: null,
            total_cards: 10,
            unique_catalog_cards: 8,
            sets_represented: 2,
          },
          sets: [
            {
              set_id: "s1",
              set_name: "Base",
              symbol_url: null,
              logo_url: null,
              progress: { owned: 5, total: 10, percent: 50 },
              rarity_distribution: {
                common: 0,
                uncommon: 0,
                rare: 0,
                ultra: 0,
                secret: 0,
                other: 0,
              },
              variant_distribution: {
                standard: 0,
                holo: 0,
                reverse: 0,
                promo: 0,
                alt_art: 0,
                other: 0,
              },
              missing_count: 5,
            },
          ],
          rarity_distribution: {
            common: 0,
            uncommon: 0,
            rare: 0,
            ultra: 0,
            secret: 0,
            other: 0,
          },
          variant_distribution: {
            standard: 0,
            holo: 0,
            reverse: 0,
            promo: 0,
            alt_art: 0,
            other: 0,
          },
          duplicate_count: 0,
          total_variants: 2,
        },
      ],
    });
    expect(stats.total_cards).toBe(10);
    expect(stats.binder_count).toBe(2);
  });
});

describe("binder upgrade phase 5 — export HTML", () => {
  it("builds static HTML export", () => {
    const html = buildBinderExportHtml({
      binderId: "binder-1",
      name: "Trade Binder",
      description: "For swaps",
      ownerDisplay: "Ash",
      insights: null,
      slots: [
        { page: 0, slot_index: 0, name: "Pikachu", image_url: "https://example.com/p.png" },
      ],
      links: [{ label: "Holo binder", target_binder_id: "b2", target_name: "Holos" }],
    });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Trade Binder");
    expect(html).toContain("Pikachu");
    expect(html).toContain("Holo binder");
    expect(html).not.toContain("<script");
  });
});
