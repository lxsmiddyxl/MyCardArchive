import type {
  CollectionOverlapMetrics,
  IndexQtyRow,
  UserMatch,
} from "@/lib/matching/types";

function cardIdSet(rows: IndexQtyRow[]): Set<string> {
  return new Set(rows.map((r) => r.card_id));
}

/**
 * Phase 2 scores: compatibility (0–100), overlap metrics, trade potential (unbounded scale, comparable across rows).
 */
export function enrichUserMatchPhase2(
  base: UserMatch,
  ctx: {
    myHave: IndexQtyRow[];
    myWant: IndexQtyRow[];
    theirHave: IndexQtyRow[];
    theirWant: IndexQtyRow[];
  }
): UserMatch {
  const myIds = cardIdSet([...ctx.myHave, ...ctx.myWant]);
  const theirIds = cardIdSet([...ctx.theirHave, ...ctx.theirWant]);
  let inter = 0;
  for (const id of myIds) {
    if (theirIds.has(id)) inter += 1;
  }
  const union = myIds.size + theirIds.size - inter;
  const jaccardIndexed = union > 0 ? inter / union : 0;

  const tradeIds = new Set<string>();
  for (const l of base.matchingCards) tradeIds.add(l.cardId);
  for (const l of base.reverseMatchingCards) tradeIds.add(l.cardId);

  const overlap: CollectionOverlapMetrics = {
    jaccardIndexed: Math.round(jaccardIndexed * 1000) / 1000,
    unionIndexedDistinct: union,
    tradeRelevantDistinct: tradeIds.size,
  };

  const scoreNorm = base.score / (base.score + 24);
  const compatibilityScore = Math.round(100 * (0.55 * jaccardIndexed + 0.45 * Math.min(1, scoreNorm)));

  const tradePotential =
    Math.round(base.score * (1 + Math.log1p(base.overlapCount)) * 10) / 10;

  return {
    ...base,
    compatibilityScore,
    collectionOverlap: overlap,
    tradePotential,
  };
}
