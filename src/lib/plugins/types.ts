/** Foundations for optional app extensions (Phase 55). */

export type PluginCapability = "card_metadata" | "scoring_rules" | "grading_overlay";

export type CardMetadataContext = {
  cardId: string;
  name?: string | null;
  setId?: string | null;
};

export type ScoringContext = {
  /** Opaque hook for future rules engines */
  surface: string;
  payload: Record<string, unknown>;
};

export type GradingOverlayContext = {
  cardId: string;
  side: "front" | "back";
};

export type McaPlugin = {
  id: string;
  version: string;
  capabilities: PluginCapability[];
  /** Optional: enrich card metadata in UI or exports. */
  extendCardMetadata?: (ctx: CardMetadataContext) => Record<string, unknown>;
  /** Optional: contribute a numeric score fragment (0–1) for aggregation. */
  scoreFragment?: (ctx: ScoringContext) => number | null;
  /** Optional: extra overlay hints for grading surfaces. */
  gradingOverlayHints?: (ctx: GradingOverlayContext) => string[];
};
