import type { AutoMatchCandidate, AutoMatchResult } from "@/lib/types/auto-match";
import { detectVariantHints } from "@/mca-utils/scan/variantDetection";
import { classifySetSymbol } from "@/mca-utils/scan/setSymbolClassifier";
import {
  mergeNumberFallbackPasses,
  numberMatchScore,
  type NumberOcrPass,
} from "@/mca-utils/scan/numberFallback";
import { clamp01, type GrayImage } from "@/mca-utils/scan/imageGray";
import type { ScanRankingResult, RankedScanCandidate } from "@/lib/scanning/phase3/types";

function fuzzyNameScore(query: string, candidateName: string): number {
  const q = query.trim().toLowerCase();
  const n = candidateName.trim().toLowerCase();
  if (!q || !n) return 0;
  if (q === n) return 1;
  if (n.includes(q) || q.includes(n)) return 0.82;
  const qTokens = q.split(/\s+/).filter(Boolean);
  const hits = qTokens.filter((t) => n.includes(t)).length;
  return qTokens.length ? clamp01(hits / qTokens.length) : 0;
}

function imageSimilarityHeuristic(
  variantGroup: string,
  rarity: string | null,
  holoShine: number
): number {
  const r = (rarity ?? "").toLowerCase();
  let base = 0.35;
  if (r.includes("secret") || r.includes("ultra")) base += 0.2;
  if (variantGroup === "holo" && r.includes("holo")) base += 0.25;
  if (variantGroup === "reverse_holo" && r.includes("reverse")) base += 0.25;
  return clamp01(base + holoShine * 0.2);
}

function toRanked(
  c: AutoMatchCandidate,
  ctx: {
    gray: GrayImage | null;
    nameQuery: string;
    ocrStem: string;
    setSymbolBoost: number;
    variantGroup: string;
    holoShine: number;
  }
): RankedScanCandidate | null {
  const id = c.catalog_card_id?.trim();
  if (!id) return null;
  const fuzzy = fuzzyNameScore(ctx.nameQuery, c.card_name);
  const ocrNum = numberMatchScore(c.number, ctx.ocrStem);
  const imageSim = imageSimilarityHeuristic(ctx.variantGroup, c.rarity, ctx.holoShine);
  const confidence = clamp01(
    c.confidence * 0.42 +
      ctx.setSymbolBoost * 0.18 +
      ocrNum * 0.2 +
      fuzzy * 0.12 +
      imageSim * 0.08
  );
  return {
    ...c,
    catalog_card_id: id,
    confidence,
    variantGroup: ctx.variantGroup,
    setSymbolScore: ctx.setSymbolBoost,
    ocrNumberScore: ocrNum,
    fuzzyNameScore: fuzzy,
    imageSimilarityScore: imageSim,
  };
}

export type RankCandidatesInput = {
  autoMatch: AutoMatchResult;
  gray: GrayImage | null;
  nameQuery: string;
  numberPasses: NumberOcrPass[];
  knownSetIds?: string[];
};

export function rankScanCandidates(input: RankCandidatesInput): ScanRankingResult {
  const variant = input.gray ? detectVariantHints(input.gray) : null;
  const variantGroup = variant?.variantGroup ?? "standard";
  const holoShine = variant?.holoShine ?? 0;
  const setSymbols = input.gray
    ? classifySetSymbol(input.gray, input.knownSetIds ?? [])
    : [];
  const topSet = setSymbols[0];
  const ocrStem = mergeNumberFallbackPasses(input.numberPasses);

  const ranked: RankedScanCandidate[] = [];
  for (const m of input.autoMatch.matches) {
    const setBoost =
      topSet && m.set_id === topSet.setId ? clamp01(topSet.confidence) : topSet ? topSet.confidence * 0.35 : 0;
    const row = toRanked(m, {
      gray: input.gray,
      nameQuery: input.nameQuery,
      ocrStem,
      setSymbolBoost: setBoost,
      variantGroup,
      holoShine,
    });
    if (row) ranked.push(row);
  }

  ranked.sort((a, b) => b.confidence - a.confidence);
  const topCandidate = ranked[0] ?? null;
  const secondaryCandidates = ranked.slice(1, 8);

  return {
    topCandidate,
    secondaryCandidates,
    allCandidates: ranked,
  };
}

export function rankingToAutoMatch(ranking: ScanRankingResult): AutoMatchResult {
  const matches = ranking.allCandidates.map((c) => {
    const { variantGroup: _vg, setSymbolScore: _ss, ocrNumberScore: _on, fuzzyNameScore: _fn, imageSimilarityScore: _im, ...rest } = c;
    return rest as AutoMatchCandidate;
  });
  const best = ranking.topCandidate
    ? (() => {
        const { variantGroup: _vg, setSymbolScore: _ss, ocrNumberScore: _on, fuzzyNameScore: _fn, imageSimilarityScore: _im, ...rest } =
          ranking.topCandidate;
        return rest as AutoMatchCandidate;
      })()
    : null;
  return { matches, best_match: best };
}
