import {
  type ReputationDimensionId,
  getReputationDimensionById,
} from "@/lib/reputation/reputation-catalog";

export type ReputationScores = {
  helpfulness: number;
  expertise: number;
  positivity: number;
  reliability: number;
  contribution: number;
};

const ORDER: ReputationDimensionId[] = [
  "helpfulness",
  "expertise",
  "positivity",
  "reliability",
  "contribution",
];

const STRONG = 52;

/** Highest-scoring dimension among those at or above `minScore` (default strong band). */
export function pickTopReputationDimension(
  scores: ReputationScores | null | undefined,
  minScore = STRONG
): ReputationDimensionId | null {
  if (!scores) return null;
  let best: ReputationDimensionId | null = null;
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

/**
 * Qualitative one-liner for social surfaces — no numeric scores.
 * Uses top two dimensions above a relaxed threshold.
 */
export function buildReputationSummaryLine(
  scores: ReputationScores | null | undefined,
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
    .map((r) => getReputationDimensionById(r.id)?.displayName?.toLowerCase())
    .filter(Boolean) as string[];
  if (labels.length === 1) {
    return `Known for ${labels[0]}`;
  }
  return `Known for ${labels[0]} and ${labels[1]}`;
}
