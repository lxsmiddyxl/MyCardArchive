/**
 * Reputation v3 — transparent trust blend (Phase 78).
 *
 * Mapping (documented, non-punitive):
 * - Base: `compositeReputation01(graph)` from existing graph dimensions (0–1).
 * - Trade reliability: completed trades vs attempted window — adds up to +0.06 when strong.
 * - Community participation: posts authored (log-scaled cap) — up to +0.04.
 * - Report pressure: ordinal `report_count_bucket` 0..3 from moderation telemetry — subtracts up to 0.05
 *   without exposing who reported whom.
 *
 * Output is clamped to [0,1] and intended for ranking hints / copy, not disciplinary action.
 */

import { compositeReputation01, type ReputationGraphRow } from "@/lib/reputation/composite-score";

export type ReputationV3Inputs = {
  graph: ReputationGraphRow | null;
  /** Count of completed trades involving the user (Phase 78 proxy for reliability). */
  trades_completed: number;
  /** Total trades the user participated in (any terminal-ish state). */
  trades_total: number;
  /** Community posts authored (qualitative participation). */
  community_posts: number;
  /** 0 = none, 1 = low, 2 = medium, 3 = elevated (server-derived bucket, never raw IDs). */
  report_count_bucket: number;
};

export function trustScoreV3(input: ReputationV3Inputs): number {
  const base = compositeReputation01(input.graph);
  const denom = Math.max(1, input.trades_total);
  const completion = Math.min(1, input.trades_completed / denom);
  const tradeBoost = 0.06 * completion;

  const posts = Math.max(0, input.community_posts);
  const communityBoost = 0.04 * Math.min(1, Math.log1p(posts) / 4);

  const bucket = Math.min(3, Math.max(0, Math.floor(input.report_count_bucket)));
  const reportDrag = 0.05 * (bucket / 3);

  const v = base + tradeBoost + communityBoost - reportDrag;
  return Math.min(1, Math.max(0, v));
}
