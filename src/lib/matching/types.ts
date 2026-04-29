/** Phase 2: coarse collection similarity + trade-relevant counts. */
export type CollectionOverlapMetrics = {
  /** |A ∩ B| / |A ∪ B| on indexed card-id sets (both users). */
  jaccardIndexed: number;
  /** Distinct card ids in either user's haves or wants. */
  unionIndexedDistinct: number;
  /** Distinct card ids that participate in at least one trade-direction line. */
  tradeRelevantDistinct: number;
};

/** One overlapping card line in a match (quantities are tradeable overlap, not full inventory). */
export type MatchCardLine = {
  cardId: string;
  quantity: number;
  /** Present when joined from `cards`. */
  name?: string | null;
};

/**
 * Match against another profile for trade discovery.
 * - `matchingCards`: you have these cards; they want them.
 * - `reverseMatchingCards`: you want these cards; they have them.
 */
export type UserMatch = {
  userId: string;
  /** Distinct card ids that appear in either direction (union). */
  overlapCount: number;
  /** Sum of min-quantity overlaps in both directions (higher = stronger fit). */
  score: number;
  matchingCards: MatchCardLine[];
  reverseMatchingCards: MatchCardLine[];
  /** Phase 2: 0–100 blend of index similarity and trade fit. */
  compatibilityScore?: number;
  /** Phase 2: collection-level overlap metrics. */
  collectionOverlap?: CollectionOverlapMetrics;
  /** Phase 2: ranked trade opportunity score. */
  tradePotential?: number;
};

/** Minimal quantity-bearing row from index tables. */
export type IndexQtyRow = {
  card_id: string;
  quantity: number;
};
