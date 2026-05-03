/**
 * Phase 77 — Hybrid feed ranking (ML relevance + heuristics + per-user personalization).
 * ML scores are deterministic placeholders keyed by viewer + item (no network); SQL v2 still supplies heuristics.
 */

export type FeedItemForRank = {
  id: string;
  kind: string;
  actor_id: string;
  created_at: string;
  rank_score?: number;
  signals?: Record<string, number>;
};

export type HybridRankingMeta = {
  version: "v3";
  hybrid: number;
  ml: number;
  heuristic: number;
  personalized: number;
  used_ml: boolean;
};

function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 10000) / 10000;
}

/** Stand-in for an ML relevance model: stable per (viewer, item, actor). */
export function mlRelevanceScore(viewerId: string, item: FeedItemForRank): number {
  const assist = typeof item.signals?.ml_assist === "number" ? item.signals.ml_assist : 0;
  const neural = hash01(`mca:feed:ml:${viewerId}:${item.id}:${item.actor_id}`);
  return Math.min(1, 0.72 * neural + 0.28 * Math.min(1, assist * 45));
}

export function heuristicScore(item: FeedItemForRank): number {
  const s = item.signals;
  if (!s) {
    return typeof item.rank_score === "number" ? Math.min(1, item.rank_score / 1e7) : 0;
  }
  const r = Math.min(1, Math.max(0, (s.recency_epoch ?? 0) / 2e9));
  const m = (s.mutual ?? 0) > 0 ? 1 : 0;
  const e = Math.min(1, (s.engagement ?? 0) / 6000);
  const sh = Math.min(1, (s.shared_sets ?? 0) / 800);
  const mk = Math.min(1, (s.marketplace_overlap ?? 0) / 1000);
  /** Feed v3 / Social Feed v3 — SQL `get_global_feed_v3` optional signals (0 when absent). */
  const ia = Math.min(1, (s.identity_alignment ?? 0) / 720);
  const pp = Math.min(1, (s.presence_proximity ?? 0) / 7200);
  const cf = Math.min(1, (s.cluster_fusion ?? 0) / 1760);
  return (
    0.18 * r +
    0.24 * m +
    0.15 * e +
    0.14 * sh +
    0.13 * mk +
    0.08 * ia +
    0.04 * pp +
    0.04 * cf
  );
}

/** Per-user personalization: mutuals, overlap, stable actor affinity. */
export function personalizedBoost(viewerId: string, item: FeedItemForRank): number {
  const s = item.signals;
  const mutual = s && (s.mutual ?? 0) > 0 ? 0.35 : 0;
  const affinity = hash01(`mca:feed:pr:${viewerId}:${item.actor_id}`) * 0.12;
  const overlap =
    s != null ? Math.min(0.28, ((s.shared_sets ?? 0) / 1200 + (s.marketplace_overlap ?? 0) / 1500) * 0.5) : 0;
  const cluster =
    s != null ? Math.min(0.12, ((s.cluster_fusion ?? 0) / 1760 + (s.identity_alignment ?? 0) / 720) * 0.22) : 0;
  return Math.min(1, mutual + affinity + overlap + cluster);
}

export type HybridRankOptions = {
  /** Weight for ML branch; remainder split between heuristic and personalization. */
  mlWeight?: number;
  /** When false, ML branch is skipped (heuristic + personalization only). */
  useMl?: boolean;
};

const DEFAULT_ML_W = 0.38;

export function hybridScore(
  viewerId: string,
  item: FeedItemForRank,
  opts: HybridRankOptions
): { score: number; meta: HybridRankingMeta } {
  const mlW = opts.mlWeight ?? DEFAULT_ML_W;
  const useMl = opts.useMl !== false;
  const h = heuristicScore(item);
  const p = personalizedBoost(viewerId, item);
  let ml = mlRelevanceScore(viewerId, item);
  let used = useMl;
  if (!useMl) {
    ml = 0;
    used = false;
  }
  const restW = 1 - mlW;
  const heurW = restW * 0.62;
  const persW = restW * 0.38;
  const hybrid = mlW * ml + heurW * h + persW * p;
  return {
    score: hybrid,
    meta: {
      version: "v3",
      hybrid,
      ml,
      heuristic: h,
      personalized: p,
      used_ml: used,
    },
  };
}

export function rankFeedItemsHybrid(
  viewerId: string,
  items: FeedItemForRank[],
  opts?: HybridRankOptions
): { items: FeedItemForRank[]; debug: HybridRankingMeta[] } {
  const enriched = items.map((it) => {
    const { score, meta } = hybridScore(viewerId, it, opts ?? {});
    return { it, score, meta };
  });
  enriched.sort((a, b) => b.score - a.score || +new Date(b.it.created_at) - +new Date(a.it.created_at));
  return {
    items: enriched.map((e) => e.it),
    debug: enriched.map((e) => e.meta),
  };
}
