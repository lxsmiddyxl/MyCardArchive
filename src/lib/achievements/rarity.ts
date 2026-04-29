export type AchievementRarity = "common" | "rare" | "legendary";

export function normalizeRarity(raw: string | null | undefined): AchievementRarity {
  const x = raw?.trim().toLowerCase() ?? "";
  if (x === "legendary" || x === "rare" || x === "common") {
    return x;
  }
  return "common";
}

/** Higher = more prominent; use for DESC sort */
export function raritySortRank(raw: string | null | undefined): number {
  const r = normalizeRarity(raw);
  if (r === "legendary") return 3;
  if (r === "rare") return 2;
  return 1;
}

/** Badge / heading label */
export function rarityDisplay(raw: string | null | undefined): string {
  const r = normalizeRarity(raw);
  return r.charAt(0).toUpperCase() + r.slice(1);
}
