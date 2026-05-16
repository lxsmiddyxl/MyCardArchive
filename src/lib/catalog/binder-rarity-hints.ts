export type RarityBucket = "common" | "uncommon" | "rare" | "ultra" | "secret" | "other";

export type BinderRarityDistribution = Record<RarityBucket, number>;

export function normalizeRarityBucket(raw: string | null | undefined): RarityBucket {
  const t = (raw ?? "").toLowerCase();
  if (!t) return "other";
  if (t.includes("secret")) return "secret";
  if (t.includes("ultra") || t.includes("illustration") || t.includes("special")) return "ultra";
  if (t.includes("rare holo") || t === "rare" || t.includes("double rare")) return "rare";
  if (t.includes("uncommon")) return "uncommon";
  if (t.includes("common")) return "common";
  if (t.includes("rare")) return "rare";
  return "other";
}

export function buildRarityDistribution(
  rarities: (string | null | undefined)[]
): BinderRarityDistribution {
  const out: BinderRarityDistribution = {
    common: 0,
    uncommon: 0,
    rare: 0,
    ultra: 0,
    secret: 0,
    other: 0,
  };
  for (const r of rarities) {
    out[normalizeRarityBucket(r)] += 1;
  }
  return out;
}

/** True when this rarity bucket is uncommon relative to what is already in the binder set. */
export function isRareForBinder(
  rarity: string | null | undefined,
  distribution: BinderRarityDistribution
): boolean {
  const bucket = normalizeRarityBucket(rarity);
  const total = Object.values(distribution).reduce((a, b) => a + b, 0);
  if (total < 3) return bucket === "rare" || bucket === "ultra" || bucket === "secret";
  const count = distribution[bucket] ?? 0;
  if (bucket === "common" || bucket === "uncommon") {
    return count === 0 && total >= 8;
  }
  if (bucket === "rare" || bucket === "ultra" || bucket === "secret") {
    const rareish = distribution.rare + distribution.ultra + distribution.secret;
    return rareish <= Math.max(1, Math.floor(total * 0.15));
  }
  return false;
}

export const RARITY_BUCKET_LABELS: Record<RarityBucket, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  ultra: "Ultra",
  secret: "Secret",
  other: "Other",
};
