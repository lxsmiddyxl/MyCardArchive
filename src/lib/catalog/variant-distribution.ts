export type VariantBucket =
  | "standard"
  | "holo"
  | "reverse"
  | "promo"
  | "alt_art"
  | "other";

export type VariantDistribution = Record<VariantBucket, number>;

export const VARIANT_BUCKET_LABELS: Record<VariantBucket, string> = {
  standard: "Standard",
  holo: "Holo",
  reverse: "Reverse holo",
  promo: "Promo",
  alt_art: "Alt art",
  other: "Other",
};

export function emptyVariantDistribution(): VariantDistribution {
  return {
    standard: 0,
    holo: 0,
    reverse: 0,
    promo: 0,
    alt_art: 0,
    other: 0,
  };
}

/** Bucket catalog / card metadata into variant groups for binder analytics. */
export function normalizeVariantBucket(
  subtypes: string[] | null | undefined,
  rarity: string | null | undefined
): VariantBucket {
  const subLower = (subtypes ?? []).map((s) => s.toLowerCase());
  const r = (rarity ?? "").toLowerCase();

  if (subLower.some((s) => s.includes("reverse"))) return "reverse";
  if (subLower.some((s) => s.includes("promo"))) return "promo";
  if (subLower.some((s) => s.includes("alternate") || s.includes("alt"))) return "alt_art";
  if (subLower.some((s) => s.includes("holo")) || r.includes("holo")) return "holo";
  if (
    subLower.some((s) => s.includes("special") || s.includes("illustration")) ||
    r.includes("illustration")
  ) {
    return "other";
  }
  if (!subtypes?.length && !rarity?.trim()) return "standard";
  return "standard";
}

export function buildVariantDistribution(
  entries: { subtypes: string[] | null | undefined; rarity: string | null | undefined }[]
): VariantDistribution {
  const out = emptyVariantDistribution();
  for (const e of entries) {
    out[normalizeVariantBucket(e.subtypes, e.rarity)] += 1;
  }
  return out;
}

export function countNonStandardVariants(dist: VariantDistribution): number {
  return (
    dist.holo +
    dist.reverse +
    dist.promo +
    dist.alt_art +
    dist.other
  );
}
