/**
 * Trade matching against `user_wantlist_index` / `user_havelist_index`.
 *
 * Cross-user reads (other members’ index rows) require either:
 * - a Supabase client that bypasses RLS (e.g. service role on the server), or
 * - additional `SELECT` policies on these index tables for authenticated matching.
 *
 * Own-row reads (current user’s haves/wants) always work with the normal user client.
 */

import { enrichUserMatchPhase2 } from "@/lib/matching/scoring";
import type { Database } from "@/lib/supabase/types";
import type { IndexQtyRow, MatchCardLine, UserMatch } from "@/lib/matching/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const TOP_MATCH_DEFAULT = 50;

function toQtyRows(rows: { card_id: string; quantity: number }[] | null): IndexQtyRow[] {
  return (rows ?? []).map((r) => ({ card_id: r.card_id, quantity: r.quantity }));
}

function qtyMap(rows: IndexQtyRow[]): Map<string, number> {
  return new Map(rows.map((r) => [r.card_id, r.quantity]));
}

/**
 * Overlap between two quantity maps: for each shared card id, contribution is min(a,b).
 */
export function computeMatchScore(
  myCards: { cardId: string; quantity: number }[],
  theirCards: { cardId: string; quantity: number }[]
): { overlapCount: number; score: number } {
  const a = qtyMap(myCards.map((c) => ({ card_id: c.cardId, quantity: c.quantity })));
  const b = qtyMap(theirCards.map((c) => ({ card_id: c.cardId, quantity: c.quantity })));
  let score = 0;
  let overlapCount = 0;
  for (const [cardId, q] of a) {
    const t = b.get(cardId);
    if (t !== undefined) {
      overlapCount += 1;
      score += Math.min(q, t);
    }
  }
  return { overlapCount, score };
}

/** I have / they want → lines with min quantity. */
function matchingHaveWant(
  myHave: IndexQtyRow[],
  theirWant: IndexQtyRow[]
): MatchCardLine[] {
  const want = qtyMap(theirWant);
  const out: MatchCardLine[] = [];
  for (const h of myHave) {
    const w = want.get(h.card_id);
    if (w !== undefined) {
      out.push({ cardId: h.card_id, quantity: Math.min(h.quantity, w) });
    }
  }
  return out;
}

/** I want / they have → lines with min quantity. */
function matchingWantHave(myWant: IndexQtyRow[], theirHave: IndexQtyRow[]): MatchCardLine[] {
  const have = qtyMap(theirHave);
  const out: MatchCardLine[] = [];
  for (const w of myWant) {
    const hq = have.get(w.card_id);
    if (hq !== undefined) {
      out.push({ cardId: w.card_id, quantity: Math.min(w.quantity, hq) });
    }
  }
  return out;
}

function distinctOverlapCount(a: MatchCardLine[], b: MatchCardLine[]): number {
  const s = new Set<string>();
  for (const x of a) s.add(x.cardId);
  for (const x of b) s.add(x.cardId);
  return s.size;
}

function totalScoreLines(a: MatchCardLine[], b: MatchCardLine[]): number {
  let s = 0;
  for (const x of a) s += x.quantity;
  for (const x of b) s += x.quantity;
  return s;
}

async function fetchMyIndexes(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ myHave: IndexQtyRow[]; myWant: IndexQtyRow[] }> {
  const [haveRes, wantRes] = await Promise.all([
    supabase.from("user_havelist_index").select("card_id, quantity").eq("user_id", userId),
    supabase.from("user_wantlist_index").select("card_id, quantity").eq("user_id", userId),
  ]);
  return {
    myHave: toQtyRows(haveRes.data),
    myWant: toQtyRows(wantRes.data),
  };
}

async function fetchTheirIndexes(
  supabase: SupabaseClient<Database>,
  otherUserId: string
): Promise<{ theirHave: IndexQtyRow[]; theirWant: IndexQtyRow[] }> {
  const [haveRes, wantRes] = await Promise.all([
    supabase.from("user_havelist_index").select("card_id, quantity").eq("user_id", otherUserId),
    supabase.from("user_wantlist_index").select("card_id, quantity").eq("user_id", otherUserId),
  ]);
  return {
    theirHave: toQtyRows(haveRes.data),
    theirWant: toQtyRows(wantRes.data),
  };
}

async function enrichNames(
  supabase: SupabaseClient<Database>,
  lines: MatchCardLine[]
): Promise<MatchCardLine[]> {
  if (lines.length === 0) return lines;
  const ids = [...new Set(lines.map((l) => l.cardId))];
  const { data } = await supabase.from("cards").select("id, name").in("id", ids);
  const map = new Map((data ?? []).map((c) => [c.id, c.name as string | null]));
  return lines.map((l) => ({ ...l, name: map.get(l.cardId) ?? null }));
}

async function buildUserMatch(
  supabase: SupabaseClient<Database>,
  myUserId: string,
  otherUserId: string
): Promise<UserMatch | null> {
  if (otherUserId === myUserId) return null;

  const { myHave, myWant } = await fetchMyIndexes(supabase, myUserId);
  const { theirHave, theirWant } = await fetchTheirIndexes(supabase, otherUserId);

  let matchingCards = matchingHaveWant(myHave, theirWant);
  let reverseMatchingCards = matchingWantHave(myWant, theirHave);

  matchingCards = await enrichNames(supabase, matchingCards);
  reverseMatchingCards = await enrichNames(supabase, reverseMatchingCards);

  const overlapCount = distinctOverlapCount(matchingCards, reverseMatchingCards);
  const score = totalScoreLines(matchingCards, reverseMatchingCards);

  if (matchingCards.length === 0 && reverseMatchingCards.length === 0) {
    return null;
  }

  const base: UserMatch = {
    userId: otherUserId,
    overlapCount,
    score,
    matchingCards,
    reverseMatchingCards,
  };

  return enrichUserMatchPhase2(base, {
    myHave,
    myWant,
    theirHave,
    theirWant,
  });
}

/**
 * Members who want at least one card you list in `user_havelist_index` (excluding yourself).
 */
export async function getUsersWhoWantMyCards(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserMatch[]> {
  const { myHave } = await fetchMyIndexes(supabase, userId);
  if (myHave.length === 0) return [];

  const myCardIds = [...new Set(myHave.map((r) => r.card_id))];
  const { data: wantHits, error } = await supabase
    .from("user_wantlist_index")
    .select("user_id, card_id, quantity")
    .in("card_id", myCardIds)
    .neq("user_id", userId);

  if (error || !wantHits?.length) return [];

  const candidateIds = [...new Set(wantHits.map((r) => r.user_id))];
  const out: UserMatch[] = [];

  for (const other of candidateIds) {
    const m = await buildUserMatch(supabase, userId, other);
    if (m && m.matchingCards.length > 0) {
      out.push(m);
    }
  }

  return out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.tradePotential ?? 0) - (a.tradePotential ?? 0);
  });
}

/**
 * Members who have at least one card you list in `user_wantlist_index` (excluding yourself).
 */
export async function getUsersWhoHaveCardsIWant(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserMatch[]> {
  const { myWant } = await fetchMyIndexes(supabase, userId);
  if (myWant.length === 0) return [];

  const wantCardIds = [...new Set(myWant.map((r) => r.card_id))];
  const { data: haveHits, error } = await supabase
    .from("user_havelist_index")
    .select("user_id, card_id, quantity")
    .in("card_id", wantCardIds)
    .neq("user_id", userId);

  if (error || !haveHits?.length) return [];

  const candidateIds = [...new Set(haveHits.map((r) => r.user_id))];
  const out: UserMatch[] = [];

  for (const other of candidateIds) {
    const m = await buildUserMatch(supabase, userId, other);
    if (m && m.reverseMatchingCards.length > 0) {
      out.push(m);
    }
  }

  return out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (b.tradePotential ?? 0) - (a.tradePotential ?? 0);
  });
}

/**
 * Ranked mutual matches (union of both directions), best first.
 */
export async function getTopMatchesForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = TOP_MATCH_DEFAULT
): Promise<UserMatch[]> {
  const { myHave, myWant } = await fetchMyIndexes(supabase, userId);
  if (myHave.length === 0 && myWant.length === 0) return [];

  const myHaveIds = [...new Set(myHave.map((r) => r.card_id))];
  const myWantIds = [...new Set(myWant.map((r) => r.card_id))];
  const candidateIds = new Set<string>();

  if (myHaveIds.length > 0) {
    const { data } = await supabase
      .from("user_wantlist_index")
      .select("user_id")
      .in("card_id", myHaveIds)
      .neq("user_id", userId);
    (data ?? []).forEach((r) => candidateIds.add(r.user_id));
  }
  if (myWantIds.length > 0) {
    const { data } = await supabase
      .from("user_havelist_index")
      .select("user_id")
      .in("card_id", myWantIds)
      .neq("user_id", userId);
    (data ?? []).forEach((r) => candidateIds.add(r.user_id));
  }

  const out: UserMatch[] = [];
  for (const uid of candidateIds) {
    const m = await buildUserMatch(supabase, userId, uid);
    if (m) out.push(m);
  }

  return out
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.tradePotential ?? 0) - (a.tradePotential ?? 0);
    })
    .slice(0, limit);
}
