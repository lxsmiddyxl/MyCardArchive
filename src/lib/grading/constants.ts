/** Pipeline identifier (envelope + heuristic fallback + optional remote model). v2 adds confidence, subscore detail, explanations. */
export const GRADING_PIPELINE_VERSION = "pipeline-v2";

/** Deterministic fallback when no model is configured or validation fails. */
export const HEURISTIC_FALLBACK_VERSION = "heuristic-v1";
