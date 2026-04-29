import { GRADING_PIPELINE_VERSION, HEURISTIC_FALLBACK_VERSION } from "@/lib/grading/constants";
import { computeGradeSummary } from "@/lib/grading/heuristic";
import type {
  GradeSummary,
  GradingDimensionConfidence,
  GradingExplanation,
  GradingPayload,
  GradingSideAnalysis,
} from "@/lib/grading/types";

function isEdgeWear(v: unknown): v is { top: number; right: number; bottom: number; left: number } {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.top === "number" &&
    typeof o.right === "number" &&
    typeof o.bottom === "number" &&
    typeof o.left === "number"
  );
}

function isNumberGrid(v: unknown): v is number[][] {
  return Array.isArray(v) && v.every((row) => Array.isArray(row) && row.every((x) => typeof x === "number"));
}

const REGION_KEYS = [
  "top_edge",
  "bottom_edge",
  "left_edge",
  "right_edge",
  "tl_corner",
  "tr_corner",
  "bl_corner",
  "br_corner",
  "surface_center",
] as const;

function parseRegionFlags(raw: unknown): GradingExplanation["regionFlags"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: NonNullable<GradingExplanation["regionFlags"]> = {};
  let any = false;
  for (const k of REGION_KEYS) {
    if (typeof o[k] === "boolean") {
      (out as Record<string, boolean>)[k] = o[k];
      any = true;
    }
  }
  return any ? out : undefined;
}

function parseExplanationHints(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw) || !raw.every((x) => typeof x === "string")) return undefined;
  return raw as string[];
}

function parseSide(raw: unknown, side: "front" | "back"): GradingSideAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.side !== side) return null;
  const centeringScore = typeof o.centeringScore === "number" ? o.centeringScore : null;
  const cornerScores = Array.isArray(o.cornerScores) && o.cornerScores.length === 4
    ? (o.cornerScores as number[])
    : null;
  const edgeWear = isEdgeWear(o.edgeWear) ? o.edgeWear : null;
  const surfaceHeatmapPreview = isNumberGrid(o.surfaceHeatmapPreview)
    ? o.surfaceHeatmapPreview
    : null;
  const confidence = typeof o.confidence === "number" ? o.confidence : null;
  if (centeringScore === null || cornerScores === null || edgeWear === null || confidence === null) {
    return null;
  }
  const explanationHints = parseExplanationHints(o.explanationHints);
  const regionFlags = parseRegionFlags(o.regionFlags);
  return {
    side,
    centeringScore,
    cornerScores: cornerScores as [number, number, number, number],
    edgeWear,
    surfaceHeatmapPreview,
    confidence,
    ...(explanationHints ? { explanationHints } : {}),
    ...(regionFlags ? { regionFlags } : {}),
  };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function parseDimensionConfidence(raw: unknown): GradingDimensionConfidence | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: GradingDimensionConfidence = {};
  if (typeof o.centering === "number") out.centering = clamp01(o.centering);
  if (typeof o.corners === "number") out.corners = clamp01(o.corners);
  if (typeof o.edges === "number") out.edges = clamp01(o.edges);
  if (typeof o.surface === "number") out.surface = clamp01(o.surface);
  return Object.keys(out).length > 0 ? out : undefined;
}

function mergeExplanation(
  fromModel: unknown,
  computed: GradingExplanation | null | undefined
): GradingExplanation | null | undefined {
  if (!fromModel || typeof fromModel !== "object") return computed ?? undefined;
  const o = fromModel as Record<string, unknown>;
  const tokens =
    Array.isArray(o.tokens) && o.tokens.every((x) => typeof x === "string")
      ? (o.tokens as string[])
      : (computed?.tokens ?? []);
  const parsedFlags = parseRegionFlags(o.regionFlags);
  const regionFlags =
    computed?.regionFlags || parsedFlags
      ? { ...computed?.regionFlags, ...parsedFlags }
      : undefined;
  let heatmapHints = computed?.heatmapHints;
  if (o.heatmapHints && typeof o.heatmapHints === "object") {
    const h = o.heatmapHints as Record<string, unknown>;
    const front = isNumberGrid(h.front) ? h.front : heatmapHints?.front;
    const back = isNumberGrid(h.back) ? h.back : heatmapHints?.back;
    heatmapHints = { front, back };
  }
  return {
    tokens,
    ...(regionFlags ? { regionFlags } : {}),
    ...(heatmapHints?.front != null || heatmapHints?.back != null ? { heatmapHints } : {}),
  };
}

/**
 * Merges optional remote summary fields (v2) over heuristic-computed summary from sides.
 */
export function mergeSummaryFromModelPayload(computed: GradeSummary, raw: unknown): GradeSummary {
  if (!raw || typeof raw !== "object") return computed;
  const s = raw as Record<string, unknown>;

  const sub = s.subgrades && typeof s.subgrades === "object" ? (s.subgrades as Record<string, unknown>) : null;

  const merged: GradeSummary = {
    ...computed,
    overall: typeof s.overall === "number" ? s.overall : computed.overall,
    label: typeof s.label === "string" ? s.label : computed.label,
    subgrades: {
      centering:
        sub && typeof sub.centering === "number" ? sub.centering : computed.subgrades.centering,
      corners: sub && typeof sub.corners === "number" ? sub.corners : computed.subgrades.corners,
      edges: sub && typeof sub.edges === "number" ? sub.edges : computed.subgrades.edges,
      surface: sub && typeof sub.surface === "number" ? sub.surface : computed.subgrades.surface,
    },
    analyzedAt: typeof s.analyzedAt === "string" ? s.analyzedAt : computed.analyzedAt,
    modelVersion: typeof s.modelVersion === "string" ? s.modelVersion : computed.modelVersion,
    pipelineVersion: typeof s.pipelineVersion === "string" ? s.pipelineVersion : computed.pipelineVersion,
    inferenceSource:
      s.inferenceSource === "model" || s.inferenceSource === "heuristic"
        ? s.inferenceSource
        : computed.inferenceSource,
    modelConfidence:
      typeof s.modelConfidence === "number" ? clamp01(s.modelConfidence) : computed.modelConfidence,
    dimensionConfidence: parseDimensionConfidence(s.dimensionConfidence) ?? computed.dimensionConfidence,
    explanation: mergeExplanation(s.explanation, computed.explanation ?? null) ?? computed.explanation,
  };

  return merged;
}

/**
 * Validates remote model JSON and returns a {@link GradingPayload} or null if invalid.
 * Accepts either `{ grade: GradingPayload }` or a top-level {@link GradingPayload} shape.
 */
export function validateModelOutput(
  raw: unknown,
  cardId: string,
  modelVersionLabel: string
): GradingPayload | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
  if (!root) return null;
  const payload = "grade" in root && root.grade ? root.grade : raw;
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.cardId === "string" && p.cardId.trim() !== cardId.trim()) {
    return null;
  }
  const front = parseSide(p.front, "front");
  const back = parseSide(p.back, "back");
  if (!front || !back) return null;

  let summary = computeGradeSummary(front, back, {
    modelVersionLabel,
    inferenceSource: "model",
  });
  if (p.summary && typeof p.summary === "object") {
    summary = mergeSummaryFromModelPayload(summary, p.summary);
  }

  return {
    cardId: cardId.trim(),
    front,
    back,
    summary: {
      ...summary,
      pipelineVersion: GRADING_PIPELINE_VERSION,
      modelVersion: summary.modelVersion ?? modelVersionLabel,
    },
  };
}

/** True if the object looks like a grading payload (loose check for inspector). */
export function describeValidationFailure(raw: unknown, cardId: string): string {
  const v = validateModelOutput(raw, cardId, HEURISTIC_FALLBACK_VERSION);
  if (v) return "ok";
  return "Model output failed schema validation (expected front/back sides with required fields).";
}
