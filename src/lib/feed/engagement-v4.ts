/**
 * Phase 82 — Engagement prediction + affinity + freshness decay layered on hybrid (v3).
 */

import {
  type FeedItemForRank,
  type HybridRankingMeta,
  hybridScore,
  type HybridRankOptions,
} from "@/lib/feed/hybrid-rank";

function hash01(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 10000) / 10000;
}

/** Lightweight engagement predictor: blends SQL engagement with deterministic variance. */
export function predictedEngagement(viewerId: string, item: FeedItemForRank): number {
  const eng = typeof item.signals?.engagement === "number" ? item.signals.engagement : 0;
  const base = Math.min(1, eng / 5200);
  const jitter = hash01(`mca:feed:pred:${viewerId}:${item.id}:${item.kind}`);
  return Math.min(1, 0.58 * base + 0.42 * jitter);
}

/** User–actor affinity (overlap + mutual + stable hash), 0–1. */
export function userAffinity(viewerId: string, item: FeedItemForRank): number {
  const s = item.signals;
  const mutual = s && (s.mutual ?? 0) > 0 ? 0.42 : 0;
  const overlap =
    s != null
      ? Math.min(
          0.45,
          ((s.shared_sets ?? 0) / 900 + (s.marketplace_overlap ?? 0) / 1200 + (s.engagement ?? 0) / 8000) * 0.55
        )
      : 0;
  const identityCluster =
    s != null
      ? Math.min(0.18, ((s.identity_alignment ?? 0) / 720 + (s.cluster_fusion ?? 0) / 1760) * 0.35)
      : 0;
  const presenceHint = s != null ? Math.min(0.08, (s.presence_proximity ?? 0) / 62000) : 0;
  const aff = hash01(`mca:feed:aff:${viewerId}:${item.actor_id}`) * 0.2;
  return Math.min(1, mutual + overlap + identityCluster + presenceHint + aff);
}

/** Exponential freshness decay (half-life ~72h). */
export function freshnessDecay(item: FeedItemForRank): number {
  const t = new Date(item.created_at).getTime();
  if (Number.isNaN(t)) return 0.5;
  const ageH = Math.max(0, (Date.now() - t) / 3600000);
  return Math.exp(-ageH / 72);
}

export type EngagementV4Meta = {
  predicted_engagement: number;
  affinity: number;
  freshness_decay: number;
  combined: number;
  why: string;
};

export type FeedRankingMetaV4 = Omit<HybridRankingMeta, "version"> & {
  version: "v4";
  v4: EngagementV4Meta;
};

function buildWhy(
  hybrid: number,
  pred: number,
  aff: number,
  fresh: number,
  meta: HybridRankingMeta,
  item: FeedItemForRank
): string {
  const parts: string[] = [];
  parts.push(`Hybrid ${hybrid.toFixed(3)} (ML ${meta.ml.toFixed(3)}, heur ${meta.heuristic.toFixed(3)})`);
  parts.push(`Predicted engagement ${pred.toFixed(3)}`);
  parts.push(`Affinity ${aff.toFixed(3)}`);
  parts.push(`Freshness ${fresh.toFixed(3)}`);
  const s = item.signals;
  if (s && (s.identity_alignment != null || s.presence_proximity != null || s.cluster_fusion != null)) {
    parts.push(
      `Feed v3 identity ${(s.identity_alignment ?? 0).toFixed(0)} · presence ${(s.presence_proximity ?? 0).toFixed(0)} · cluster ${(s.cluster_fusion ?? 0).toFixed(0)}`
    );
  }
  return parts.join(" · ");
}

const W_H = 0.42;
const W_P = 0.26;
const W_A = 0.16;
const W_F = 0.16;

export function rankFeedItemsV4(
  viewerId: string,
  items: FeedItemForRank[],
  opts?: HybridRankOptions
): { items: FeedItemForRank[]; debug: FeedRankingMetaV4[] } {
  const enriched = items.map((it) => {
    const { score: hybridVal, meta: hMeta } = hybridScore(viewerId, it, opts ?? {});
    const pred = predictedEngagement(viewerId, it);
    const aff = userAffinity(viewerId, it);
    const fresh = freshnessDecay(it);
    const combined = W_H * hybridVal + W_P * pred + W_A * aff + W_F * fresh;
    const why = buildWhy(hybridVal, pred, aff, fresh, hMeta, it);
    const v4: EngagementV4Meta = {
      predicted_engagement: pred,
      affinity: aff,
      freshness_decay: fresh,
      combined,
      why,
    };
    const full: FeedRankingMetaV4 = {
      ...hMeta,
      version: "v4",
      v4,
    };
    return { it, combined, meta: full };
  });

  enriched.sort((a, b) => b.combined - a.combined || +new Date(b.it.created_at) - +new Date(a.it.created_at));

  return {
    items: enriched.map((e) => e.it),
    debug: enriched.map((e) => e.meta),
  };
}
