import "server-only";

export function cacheKeyCardSearch(
  userId: string,
  params: { q: string; setId: string; type: string; rarity: string; offset: number; limit: number }
): string {
  return `cards:search:${userId}:${params.q}:${params.setId}:${params.type}:${params.rarity}:${params.offset}:${params.limit}`;
}

export function cacheKeyActivityList(userId: string): string {
  return `activity:list:${userId}`;
}

export function cacheKeyNotificationsList(userId: string): string {
  return `notifications:list:${userId}`;
}

/** v2: bust in-memory lists cached while SELECT RLS returned zero rows (post–migration 102). */
export function cacheKeyBindersList(userId: string): string {
  return `binders:list:v2:${userId}`;
}

export function cacheKeyDecksList(userId: string): string {
  return `decks:list:v1:${userId}`;
}

export function cacheKeyTradeDetail(userId: string, tradeId: string): string {
  return `trade:detail:${userId}:${tradeId}`;
}
