/**
 * Phase 88 — Feed ranking v5 (heuristic + local ML-assisted signals).
 */

import {
  rankFeedItemsV4,
  type FeedRankingExtrasV67,
  type FeedRankingMetaV4,
} from "@/lib/feed/engagement-v4";
import type { FeedItemForRank } from "@/lib/feed/hybrid-rank";

export type FeedRankingMetaV5 = Omit<FeedRankingMetaV4, "version"> & {
  version: "v5";
  v5: {
    trust_boost: number;
    interest_velocity: number;
    showcase_engagement: number;
    combined: number;
    why: string;
  };
};

export type FeedRankingExtrasV5 = FeedRankingExtrasV67 & {
  trustByActor?: Record<string, number>;
  interestVelocityByCatalog?: Record<string, number>;
  showcaseEngagementByActor?: Record<string, number>;
};

function showcaseEngagementForItem(
  item: FeedItemForRank,
  byActor?: Record<string, number>
): number {
  if (item.kind === "showcase_created") return 0.85;
  const raw = byActor?.[item.actor_id];
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.min(1, Math.max(0, raw));
  return 0.35;
}

function interestVelocityForItem(
  item: FeedItemForRank,
  byCatalog?: Record<string, number>
): number {
  const cardId = (item as { catalog_card_id?: string }).catalog_card_id;
  if (cardId && byCatalog?.[cardId] != null) {
    return Math.min(1, Math.max(0, byCatalog[cardId]!));
  }
  return 0.4;
}

export function rankFeedItemsV5(
  viewerId: string,
  items: FeedItemForRank[],
  opts?: Parameters<typeof rankFeedItemsV4>[2],
  extras?: FeedRankingExtrasV5
): { items: FeedItemForRank[]; debug: FeedRankingMetaV5[] } {
  const v4 = rankFeedItemsV4(viewerId, items, opts, extras);
  const enriched = v4.items.map((it, i) => {
    const meta4 = v4.debug[i];
    const base = meta4?.v4?.combined ?? 0;
    const trustRaw = extras?.trustByActor?.[it.actor_id] ?? extras?.reputationByActor?.[it.actor_id];
    const trust = typeof trustRaw === "number" ? Math.min(1, Math.max(0, trustRaw)) : 0.5;
    const trustBoost = 1 + 0.14 * (trust - 0.5) * 2;
    const interest = interestVelocityForItem(it, extras?.interestVelocityByCatalog);
    const showcase = showcaseEngagementForItem(it, extras?.showcaseEngagementByActor);
    const combined = base * trustBoost * (0.92 + 0.08 * interest) * (0.94 + 0.06 * showcase);
    const why = `${meta4?.v4?.why ?? ""} · v5 trust ${trustBoost.toFixed(3)} · interest ${interest.toFixed(2)} · showcase ${showcase.toFixed(2)}`;
    const meta5: FeedRankingMetaV5 = {
      ...meta4!,
      version: "v5",
      v5: {
        trust_boost: trustBoost,
        interest_velocity: interest,
        showcase_engagement: showcase,
        combined,
        why,
      },
    };
    return { it, combined, meta: meta5 };
  });

  enriched.sort((a, b) => b.combined - a.combined || +new Date(b.it.created_at) - +new Date(a.it.created_at));

  return {
    items: enriched.map((e) => e.it),
    debug: enriched.map((e) => e.meta),
  };
}
