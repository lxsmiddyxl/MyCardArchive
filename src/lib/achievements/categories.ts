import { raritySortRank } from "@/lib/achievements/rarity";

/** Display order for achievement sections on /achievements */
export const ACHIEVEMENT_CATEGORY_ORDER = [
  "Binders",
  "Collection",
  "Scanning",
  "Decks (future)",
  "Misc",
] as const;

export type AchievementCategoryLabel =
  (typeof ACHIEVEMENT_CATEGORY_ORDER)[number];

export function sortAchievementCategories(categories: string[]): string[] {
  const rank = new Map<string, number>(
    ACHIEVEMENT_CATEGORY_ORDER.map((c, i) => [c, i])
  );
  return Array.from(new Set(categories)).sort((a, b) => {
    const ra = rank.get(a) ?? 100;
    const rb = rank.get(b) ?? 100;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

export type CategoryRarityGroup<
  T extends { rarity: string; requirement_value: number; slug: string },
> = {
  category: string;
  groups: {
    rarity: string;
    items: T[];
  }[];
};

/** Group by category, then by rarity (legendary → rare → common), then sort by requirement_value */
export function groupAchievementsByCategoryAndRarity<
  T extends {
    category: string;
    rarity: string;
    requirement_value: number;
    slug: string;
  },
>(items: T[]): CategoryRarityGroup<T>[] {
  const byCat = new Map<string, T[]>();
  for (const item of items) {
    const c = item.category?.trim() || "Misc";
    const list = byCat.get(c);
    if (list) {
      list.push(item);
    } else {
      byCat.set(c, [item]);
    }
  }

  return sortAchievementCategories(Array.from(byCat.keys())).map(
    (category) => {
      const group = byCat.get(category) ?? [];
      const byRarity = new Map<string, T[]>();
      for (const it of group) {
        const r = (it.rarity ?? "common").toLowerCase();
        const bucket = byRarity.get(r);
        if (bucket) {
          bucket.push(it);
        } else {
          byRarity.set(r, [it]);
        }
      }

      const rarityKeys = Array.from(byRarity.keys()).sort(
        (a, b) => raritySortRank(b) - raritySortRank(a)
      );

      const groups = rarityKeys.map((rarity) => ({
        rarity,
        items: [...(byRarity.get(rarity) ?? [])].sort(
          (a, b) =>
            a.requirement_value - b.requirement_value ||
            a.slug.localeCompare(b.slug)
        ),
      }));

      return { category, groups };
    }
  );
}
