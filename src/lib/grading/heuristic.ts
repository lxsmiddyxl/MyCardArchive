import {
  GRADING_PIPELINE_VERSION,
  HEURISTIC_FALLBACK_VERSION,
} from "@/lib/grading/constants";
import type {
  GradeSummary,
  GradingDimensionConfidence,
  GradingExplanation,
  GradingPayload,
  GradingSideAnalysis,
  NormalizeInput,
} from "@/lib/grading/types";

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h, 33) ^ s.charCodeAt(i);
  }
  return Math.abs(h) >>> 0;
}

function frac(seed: number, salt: number): number {
  return ((Math.imul(seed, salt) ^ (seed >>> 3)) % 10_000) / 10_000;
}

function buildSide(side: "front" | "back", cardId: string, salt: number): GradingSideAnalysis {
  const h = djb2(`${cardId}:${side}:${salt}`);
  const centeringScore = Math.round(52 + frac(h, 11) * 43);
  const c = (i: number) => Math.round(70 + frac(h, 17 + i) * 30) / 10;
  const cornerScores: [number, number, number, number] = [c(0), c(1), c(2), c(3)];
  const edgeWear = {
    top: frac(h, 23),
    right: frac(h, 29),
    bottom: frac(h, 31),
    left: frac(h, 37),
  };
  const gridN = 6;
  const surfaceHeatmapPreview: number[][] = [];
  for (let r = 0; r < gridN; r++) {
    const row: number[] = [];
    for (let cidx = 0; cidx < gridN; cidx++) {
      row.push(frac(h, 41 + r * gridN + cidx) * 0.85);
    }
    surfaceHeatmapPreview.push(row);
  }
  const confidence = Math.round(45 + frac(h, 43) * 50) / 100;

  const explanationHints: string[] = [];
  if (edgeWear.top > 0.52) explanationHints.push("heatmap_hint:top_edge_stress");
  if (edgeWear.bottom > 0.52) explanationHints.push("heatmap_hint:bottom_edge_stress");
  if (cornerScores[0] < 7.5 || cornerScores[1] < 7.5) explanationHints.push("corner_focus:top_row");

  const regionFlags: NonNullable<GradingExplanation["regionFlags"]> = {
    top_edge: edgeWear.top > 0.48,
    bottom_edge: edgeWear.bottom > 0.48,
    left_edge: edgeWear.left > 0.48,
    right_edge: edgeWear.right > 0.48,
    tl_corner: cornerScores[0] < 8,
    tr_corner: cornerScores[1] < 8,
    bl_corner: cornerScores[2] < 8,
    br_corner: cornerScores[3] < 8,
    surface_center: frac(h, 51) > 0.35,
  };

  return {
    side,
    centeringScore,
    cornerScores,
    edgeWear,
    surfaceHeatmapPreview,
    confidence,
    explanationHints,
    regionFlags,
  };
}

export function analyzeCardFront(input: NormalizeInput): GradingSideAnalysis {
  const id = input.cardId?.trim() || "unknown";
  return buildSide("front", id, 1);
}

export function analyzeCardBack(input: NormalizeInput): GradingSideAnalysis {
  const id = input.cardId?.trim() || "unknown";
  return buildSide("back", id, 2);
}

function heuristicDimensionConfidence(
  front: GradingSideAnalysis,
  back: GradingSideAnalysis,
  sub: GradeSummary["subgrades"]
): GradingDimensionConfidence {
  const base =
    front.confidence != null && back.confidence != null
      ? (front.confidence + back.confidence) / 2
      : 0.72;
  const jitter = (k: number) => {
    const v = Math.min(0.98, Math.max(0.35, base * (0.92 + frac(djb2(`dim:${k}`), 3) * 0.08)));
    return Math.round(v * 1000) / 1000;
  };
  return {
    centering: sub.centering != null ? jitter(1) : undefined,
    corners: sub.corners != null ? jitter(2) : undefined,
    edges: sub.edges != null ? jitter(3) : undefined,
    surface: sub.surface != null ? jitter(4) : undefined,
  };
}

export function computeGradeSummary(
  front: GradingSideAnalysis,
  back: GradingSideAnalysis,
  opts?: {
    modelVersionLabel?: string | null;
    inferenceSource?: "heuristic" | "model";
  }
): GradeSummary {
  const overall =
    front.centeringScore != null && back.centeringScore != null
      ? Math.round(((front.centeringScore + back.centeringScore) / 2) * 10) / 10
      : null;

  const avgCorner = (s: GradingSideAnalysis) => {
    if (!s.cornerScores) return null;
    const [a, b, c, d] = s.cornerScores;
    return Math.round(((a + b + c + d) / 4) * 10) / 10;
  };

  const fc = avgCorner(front);
  const bc = avgCorner(back);
  const corners = fc != null && bc != null ? Math.round(((fc + bc) / 2) * 10) / 10 : null;

  const edgeAvg =
    front.edgeWear && back.edgeWear
      ? Math.round(
          ((front.edgeWear.top +
            front.edgeWear.right +
            front.edgeWear.bottom +
            front.edgeWear.left +
            back.edgeWear.top +
            back.edgeWear.right +
            back.edgeWear.bottom +
            back.edgeWear.left) /
            8) *
            1000
        ) / 1000
      : null;

  const inferenceSource = opts?.inferenceSource;
  const label =
    inferenceSource === "model"
      ? "Model preview"
      : inferenceSource === "heuristic"
        ? "Preview (heuristic)"
        : "Preview (heuristic)";

  const subgrades = {
    centering:
      front.centeringScore != null && back.centeringScore != null
        ? Math.round(((front.centeringScore + back.centeringScore) / 2) * 10) / 10
        : null,
    corners,
    edges: edgeAvg,
    surface:
      front.confidence != null && back.confidence != null
        ? Math.round(((front.confidence + back.confidence) / 2) * 100) / 100
        : null,
  };

  const modelConfidence =
    front.confidence != null && back.confidence != null
      ? Math.round(((front.confidence + back.confidence) / 2) * 1000) / 1000
      : null;

  const dimensionConfidence = heuristicDimensionConfidence(front, back, subgrades);

  const explanation: GradingExplanation = {
    tokens: [
      "pipeline:v2",
      inferenceSource === "model" ? "source:model" : "source:heuristic",
      "subscores",
      "confidence",
    ],
    heatmapHints: {
      front: front.surfaceHeatmapPreview,
      back: back.surfaceHeatmapPreview,
    },
    regionFlags: {
      ...(front.regionFlags ?? {}),
      ...(back.regionFlags ?? {}),
    },
  };

  return {
    overall,
    label,
    pipelineVersion: GRADING_PIPELINE_VERSION,
    subgrades,
    analyzedAt: new Date().toISOString(),
    modelVersion: opts?.modelVersionLabel ?? HEURISTIC_FALLBACK_VERSION,
    inferenceSource: inferenceSource ?? "heuristic",
    modelConfidence,
    dimensionConfidence,
    explanation,
  };
}

/** Full payload using deterministic heuristic (fallback path). */
export function buildHeuristicGradingPayload(cardId: string, input: NormalizeInput): GradingPayload {
  const withId = { ...input, cardId };
  const front = analyzeCardFront(withId);
  const back = analyzeCardBack(withId);
  return {
    cardId,
    front,
    back,
    summary: computeGradeSummary(front, back, { inferenceSource: "heuristic" }),
  };
}
