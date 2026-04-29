import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PlayIdentityBatchRow = {
  userId: string;
  favoriteFormatId: string | null;
  favoriteArchetypeId: string | null;
  favoriteDeckName: string | null;
  deckCountForBadges: number;
  updatedAt: string | null;
};

function emptyPlayRows(userIds: string[]): Record<string, PlayIdentityBatchRow> {
  const out: Record<string, PlayIdentityBatchRow> = {};
  for (const uid of userIds) {
    out[uid] = {
      userId: uid,
      favoriteFormatId: null,
      favoriteArchetypeId: null,
      favoriteDeckName: null,
      deckCountForBadges: 0,
      updatedAt: null,
    };
  }
  return out;
}

export async function loadSocialPlayIdentityByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, PlayIdentityBatchRow>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const { data, error } = await supabase.rpc("get_users_play_identity_batch", {
      p_user_ids: unique,
    });
    if (error || !Array.isArray(data)) return emptyPlayRows(unique);
    const out = emptyPlayRows(unique);
    for (const raw of data as Record<string, unknown>[]) {
      const uid = raw.user_id != null ? String(raw.user_id) : "";
      if (!uid) continue;
      out[uid] = {
        userId: uid,
        favoriteFormatId: raw.favorite_format_id != null ? String(raw.favorite_format_id) : null,
        favoriteArchetypeId: raw.favorite_archetype_id != null ? String(raw.favorite_archetype_id) : null,
        favoriteDeckName: raw.favorite_deck_name != null ? String(raw.favorite_deck_name) : null,
        deckCountForBadges: Number(raw.deck_count_for_badges ?? 0),
        updatedAt: raw.updated_at != null ? String(raw.updated_at) : null,
      };
    }
    return out;
  } catch {
    return emptyPlayRows(unique);
  }
}

export async function loadUserPlayIdentityRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PlayIdentityBatchRow | null> {
  const uid = userId.trim();
  if (!uid) return null;
  try {
    const map = await loadSocialPlayIdentityByUserIds(supabase, [uid]);
    return (
      map[uid] ?? {
        userId: uid,
        favoriteFormatId: null,
        favoriteArchetypeId: null,
        favoriteDeckName: null,
        deckCountForBadges: 0,
        updatedAt: null,
      }
    );
  } catch {
    return null;
  }
}

export type PlayTopDeckStatRow = {
  deckId: string;
  deckName: string;
  totalCards: number;
  uniqueCards: number;
  lastUpdated: string;
};

export async function loadUserTopDeckStatsRpc(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PlayTopDeckStatRow[]> {
  const uid = userId.trim();
  if (!uid) return [];
  try {
    const { data, error } = await supabase.rpc("get_user_top_deck_stats", { p_user_id: uid });
    if (error || !Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      deckId: String(r.deck_id ?? ""),
      deckName: String(r.deck_name ?? ""),
      totalCards: Number(r.total_cards ?? 0),
      uniqueCards: Number(r.unique_cards ?? 0),
      lastUpdated: r.last_updated != null ? String(r.last_updated) : "",
    }));
  } catch {
    return [];
  }
}
