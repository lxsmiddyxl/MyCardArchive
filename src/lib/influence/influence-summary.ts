import {
  type InfluenceDimensionId,
  getInfluenceDimensionById,
} from "@/lib/influence/influence-catalog";

export type InfluenceScores = {
  identity_reach: number;
  contribution_reach: number;
  expertise_reach: number;
  social_reach: number;
  seasonal_reach: number;
};

const ORDER: InfluenceDimensionId[] = [
  "identity_reach",
  "contribution_reach",
  "expertise_reach",
  "social_reach",
  "seasonal_reach",
];

const STRONG = 52;

export function pickTopInfluenceDimension(
  scores: InfluenceScores | null | undefined,
  minScore = STRONG
): InfluenceDimensionId | null {
  if (!scores) return null;
  let best: InfluenceDimensionId | null = null;
  let bestV = -1;
  for (const id of ORDER) {
    const v = scores[id];
    if (v >= minScore && v > bestV) {
      bestV = v;
      best = id;
    }
  }
  return best;
}

export function buildInfluenceSummaryLine(
  scores: InfluenceScores | null | undefined,
  opts?: { relaxedThreshold?: number }
): string | null {
  if (!scores) return null;
  const t = opts?.relaxedThreshold ?? 40;
  const ranked = ORDER.map((id) => ({ id, v: scores[id] }))
    .filter((x) => x.v >= t)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2);
  if (ranked.length === 0) return null;
  const labels = ranked
    .map((r) => getInfluenceDimensionById(r.id)?.displayName?.toLowerCase())
    .filter(Boolean) as string[];
  if (labels.length === 1) {
    return `Influential in ${labels[0]}`;
  }
  return `Influential in ${labels[0]} and ${labels[1]}`;
}
