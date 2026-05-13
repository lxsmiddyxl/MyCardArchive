/**
 * Collapse graph reputation dimensions into a single 0–1 score for ranking / UI (Phase 64).
 */
export type ReputationGraphRow = {
  helpfulness_score: number;
  expertise_score: number;
  positivity_score: number;
  reliability_score: number;
  contribution_score: number;
};

export function compositeReputation01(row: ReputationGraphRow | null | undefined): number {
  if (!row) return 0.5;
  const parts = [
    row.helpfulness_score,
    row.expertise_score,
    row.positivity_score,
    row.reliability_score,
    row.contribution_score,
  ].filter((n) => typeof n === "number" && Number.isFinite(n));
  if (parts.length === 0) return 0.5;
  const sum = parts.reduce((a, b) => a + b, 0);
  const avg = sum / parts.length;
  return Math.min(1, Math.max(0, Math.tanh(avg / 85)));
}
