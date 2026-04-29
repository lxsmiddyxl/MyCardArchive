/** Structured grading output — model-ready pipeline v2/v3 (confidence, explanations, region overlays). */

export type EdgeWearMap = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Optional per-dimension model confidence (0–1). */
export type GradingDimensionConfidence = {
  centering?: number;
  corners?: number;
  edges?: number;
  surface?: number;
};

/**
 * Human- or model-readable explanation tokens + optional overlay hints.
 * `tokens` are stable labels for telemetry and UI chips.
 */
/** v3: axis-aligned box in normalized 0–1 coordinates relative to the card image. */
export type GradingRegionBBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/**
 * v3: per-region explanations with optional finer heatmap slice (same grid convention as side heatmaps).
 */
export type GradingRegionIssueV3 = {
  id: string;
  label: string;
  /** 0–1 severity (higher = more concern). */
  severity: number;
  bbox: GradingRegionBBox;
  side: "front" | "back";
  /** Optional sub-grid heatmap for this region only. */
  heatmapSlice?: number[][] | null;
};

export type GradingExplanation = {
  tokens: string[];
  /** Named regions of interest (e.g. corner wear). */
  regionFlags?: Partial<
    Record<
      "top_edge" | "bottom_edge" | "left_edge" | "right_edge" | "tl_corner" | "tr_corner" | "bl_corner" | "br_corner" | "surface_center",
      boolean
    >
  >;
  /** Optional alternate heatmap weights per side (same shape as surfaceHeatmapPreview when provided). */
  heatmapHints?: {
    front?: number[][] | null;
    back?: number[][] | null;
  };
  /** Pipeline v3: region-level bounding boxes + severity (model or post-process). */
  regionsV3?: GradingRegionIssueV3[];
};

export type GradingSideAnalysis = {
  side: "front" | "back";
  /** 0–100, higher is better alignment within frame */
  centeringScore: number | null;
  /** TL, TR, BL, BR — 0–10 each when present */
  cornerScores: [number, number, number, number] | null;
  /** 0–1 wear intensity per edge */
  edgeWear: EdgeWearMap | null;
  /** Optional coarse heatmap grid (0–1), for UI preview only until models exist */
  surfaceHeatmapPreview: number[][] | null;
  /** Side-level model confidence (0–1) */
  confidence: number | null;
  /** Short hints for overlays (e.g. "edge_glare_top") */
  explanationHints?: string[];
  /** Region flags for conflict with heatmap / markers */
  regionFlags?: GradingExplanation["regionFlags"];
};

export type GradeSummary = {
  overall: number | null;
  label: string | null;
  subgrades: {
    centering: number | null;
    corners: number | null;
    edges: number | null;
    surface: number | null;
  };
  analyzedAt: string | null;
  /** Model or heuristic implementation version (e.g. remote checkpoint id). */
  modelVersion: string | null;
  /** App pipeline that produced the grade (envelope + validators). */
  pipelineVersion?: string | null;
  /** Whether scores came from a remote model or local heuristic fallback. */
  inferenceSource?: "heuristic" | "model";
  /** Aggregate model confidence for the grade (0–1). */
  modelConfidence?: number | null;
  /** Per-dimension confidence (0–1) when the model provides them. */
  dimensionConfidence?: GradingDimensionConfidence | null;
  /** Explanation tokens and overlay hints (v2). */
  explanation?: GradingExplanation | null;
  /** v4: compare to last persisted run (see `card_grading_runs`). */
  gradingConsistency?: {
    previousOverall: number | null;
    driftDelta: number | null;
    driftDetected: boolean;
  };
  /** v5: optional cross-card check vs another owned card’s last run. */
  gradingCrossCard?: {
    peerCardId: string | null;
    peerOverall: number | null;
    deltaOverall: number | null;
    consistencyWarning: boolean;
  };
  /** v5: recent persisted runs (multi-model / multi-head comparison). */
  gradingModelCompare?: {
    delta: number;
    runs: {
      modelVersion: string | null;
      modelLabel: string | null;
      pipelineVersion: string | null;
      overall: number | null;
      createdAt: string;
    }[];
  };
  /** v5: stable hash over model versions seen for this collector. */
  gradingFingerprint?: {
    hash: string;
    modelVersions: string[];
  };
  /** v6: ensemble across distinct pipeline/model heads on this card. */
  gradingFusion?: {
    fusedOverall: number;
    heads: number;
    sources: string[];
  };
  /** v6: stability of recent runs (0–1, higher = more consistent). */
  gradingStability?: {
    score: number;
    variance: number;
    sampleSize: number;
  };
  /** v6: calibration vs global cohort average. */
  gradingCalibration?: {
    offset: number;
    userAvg: number | null;
    cohortAvg: number | null;
  };
  /** v7: linear drift on recent grading runs (temporal model). */
  gradingTemporalDrift?: {
    sampleSize: number;
    slopePerDay: number;
    expectedShift7d: number;
    intercept: number;
    series: { epoch: number; overall: number; at: string | null }[];
  };
  /** v7: suggested calibration adjustment from drift (non-destructive hint). */
  gradingRecalibration?: {
    suggestedOffsetDelta: number;
    reason: string;
  };
  /** v8: cross-head + subgrade tightness consensus. */
  gradingConsensus?: {
    score: number;
    band: "tight" | "medium" | "loose";
    headsCompared: number;
    crossHeadAgreement: number;
    subgradeTightness: number;
    perDimension: {
      centering: number;
      corners: number;
      edges: number;
      surface: number;
    };
  };
  /** v8: human-readable confidence band. */
  gradingConfidenceBand?: {
    band: "tight" | "medium" | "loose";
    label: string;
  };
};

export type GradingPayload = {
  cardId: string;
  front: GradingSideAnalysis;
  back: GradingSideAnalysis;
  summary: GradeSummary;
};

export type NormalizeInput = {
  cardId?: string;
  frontImageUrl?: string | null;
  backImageUrl?: string | null;
};
