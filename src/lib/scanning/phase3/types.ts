import type { AutoMatchCandidate } from "@/lib/types/auto-match";

export type RankedCandidateScores = {
  confidence: number;
  variantGroup: string;
  setSymbolScore: number;
  ocrNumberScore: number;
  fuzzyNameScore: number;
  imageSimilarityScore: number;
};

export type RankedScanCandidate = AutoMatchCandidate &
  RankedCandidateScores & {
    catalog_card_id: string;
  };

export type ScanRankingResult = {
  topCandidate: RankedScanCandidate | null;
  secondaryCandidates: RankedScanCandidate[];
  /** Legacy-compatible flat list (ranked). */
  allCandidates: RankedScanCandidate[];
};
