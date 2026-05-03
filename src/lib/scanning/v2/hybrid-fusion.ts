import "server-only";

import type { ScanV2FusionMeta, ScanV2VisionPrediction } from "@/lib/scanning/v2/vision-types";
import type { AutoMatchCandidate, AutoMatchResult } from "@/lib/types/auto-match";

/** Below this hybrid score, catalog/OCR remains authoritative (v1.5 fallback). */
export const SCAN_V2_FUSION_FALLBACK_THRESHOLD = 0.44;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function normNum(s: string): string {
  return s.replace(/\D/g, "");
}

function setSimilarity(a: string, b: string): number {
  const A = a.toLowerCase().trim();
  const B = b.toLowerCase().trim();
  if (!A || !B) return 0;
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.85;
  return 0.28;
}

function nameOverlap(visionName: string, catalogName: string): number {
  const v = visionName.toLowerCase().trim();
  const c = catalogName.toLowerCase().trim();
  if (!v || !c) return 0;
  if (c.includes(v) || v.includes(c)) return 0.9;
  const vp = v.slice(0, 5);
  if (vp.length >= 4 && c.includes(vp)) return 0.55;
  return 0.2;
}

/**
 * Fuses vision model output with OCR + catalog (`matchExtractedToCatalog`) results.
 * When hybrid confidence is low, callers should treat OCR catalog as primary for binder UX.
 */
export function fuseVisionWithCatalog(
  vision: ScanV2VisionPrediction,
  ocrCatalog: AutoMatchResult
): {
  fused: AutoMatchResult;
  meta: ScanV2FusionMeta;
} {
  const bm = ocrCatalog.best_match;
  const vConf = clamp01(vision.overall_confidence);

  if (!bm) {
    return {
      fused: { matches: ocrCatalog.matches, best_match: null },
      meta: {
        fusion_score: clamp01(vConf * 0.35),
        agreement_score: 0,
        fallback_to_ocr_only: true,
        decision_source: "ocr_catalog",
        vision_reinforced_catalog: false,
      },
    };
  }

  let fusionScore = 0.46 * vConf + 0.54 * bm.confidence;
  let agreement = 0;

  if (vision.card_number_guess && bm.number && bm.number !== "—") {
    if (normNum(vision.card_number_guess) === normNum(bm.number)) {
      agreement += 0.13;
    }
  }
  agreement += 0.1 * setSimilarity(vision.set_name_guess, bm.set_name);
  agreement += 0.08 * nameOverlap(vision.card_name_guess, bm.card_name);

  fusionScore = clamp01(fusionScore + agreement);

  const fallback = fusionScore < SCAN_V2_FUSION_FALLBACK_THRESHOLD;
  const visionReinforced = !fallback && vConf >= 0.34 && agreement >= 0.12;

  const fusedBest: AutoMatchCandidate = {
    ...bm,
    confidence: fallback ? bm.confidence : fusionScore,
    rarity: bm.rarity?.trim() || vision.rarity_guess?.trim() || null,
  };

  const matches = ocrCatalog.matches.length
    ? ocrCatalog.matches.map((m) =>
        m.catalog_card_id === fusedBest.catalog_card_id ? fusedBest : m
      )
    : [fusedBest];

  return {
    fused: {
      matches,
      best_match: fusedBest,
    },
    meta: {
      fusion_score: fusionScore,
      agreement_score: clamp01(agreement),
      fallback_to_ocr_only: fallback,
      decision_source: fallback ? "ocr_catalog" : "hybrid",
      vision_reinforced_catalog: visionReinforced,
    },
  };
}
