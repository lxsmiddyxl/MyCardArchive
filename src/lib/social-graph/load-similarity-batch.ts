import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SimilarUserEntry = {
  userId: string;
  score: number;
};

export type UserSimilarityParsed = {
  similarUsers: SimilarUserEntry[];
  topSimilarUserId: string | null;
};

function parseRow(raw: Record<string, unknown>): UserSimilarityParsed {
  const idsRaw = raw.similar_user_ids;
  const scoresRaw = raw.similarity_scores;
  const ids = Array.isArray(idsRaw) ? idsRaw.map((x) => String(x)) : [];
  const scores = Array.isArray(scoresRaw) ? scoresRaw.map((x) => Number(x)) : [];
  const similarUsers: SimilarUserEntry[] = [];
  const n = Math.min(ids.length, scores.length);
  for (let i = 0; i < n; i++) {
    const uid = ids[i]?.trim();
    if (!uid) continue;
    const score = Number.isFinite(scores[i]) ? Number(scores[i]) : 0;
    similarUsers.push({ userId: uid, score });
  }
  return {
    similarUsers,
    topSimilarUserId: similarUsers[0]?.userId ?? null,
  };
}

/** Server-side read of cached similarity lists (no client scoring). */
export async function loadSocialSimilarityByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, UserSimilarityParsed>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  const { data, error } = await supabase.rpc("get_users_similarity_batch", {
    p_user_ids: unique,
  });
  const empty = (): UserSimilarityParsed => ({ similarUsers: [], topSimilarUserId: null });
  if (error || !Array.isArray(data)) {
    return Object.fromEntries(unique.map((id) => [id, empty()]));
  }
  const out: Record<string, UserSimilarityParsed> = Object.fromEntries(
    unique.map((id) => [id, empty()])
  );
  for (const raw of data as Record<string, unknown>[]) {
    const uid = String(raw.user_id ?? "");
    if (!uid) continue;
    out[uid] = parseRow(raw);
  }
  return out;
}
