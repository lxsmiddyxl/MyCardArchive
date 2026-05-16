import type { AutoMatchResult } from "@/lib/types/auto-match";
import type { RankedScanCandidate, ScanRankingResult } from "@/lib/scanning/phase3/types";

function toRanked(c: NonNullable<AutoMatchResult["best_match"]> & { catalog_card_id: string }): RankedScanCandidate {
  return {
    ...c,
    catalog_card_id: c.catalog_card_id!,
    variantGroup: "standard",
    setSymbolScore: 0,
    ocrNumberScore: 0,
    fuzzyNameScore: 0,
    imageSimilarityScore: 0,
  };
}

export function rankingFromAutoMatch(auto: AutoMatchResult): ScanRankingResult {
  const ranked: RankedScanCandidate[] = auto.matches
    .filter((m): m is typeof m & { catalog_card_id: string } => Boolean(m.catalog_card_id?.trim()))
    .map((m) =>
      toRanked({
        ...m,
        catalog_card_id: m.catalog_card_id!.trim(),
      })
    )
    .sort((a, b) => b.confidence - a.confidence);

  return {
    topCandidate: ranked[0] ?? null,
    secondaryCandidates: ranked.slice(1, 8),
    allCandidates: ranked,
  };
}
