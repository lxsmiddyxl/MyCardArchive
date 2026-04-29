import type { CollectionValueCacheRow } from "@/lib/value/value-identity-helpers";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type GrailHighlightBatchRow = {
  userId: string;
  grailCount: number;
  highlightName: string | null;
};

function emptyValueRow(userId: string): CollectionValueCacheRow {
  return {
    estimatedValueCents: 0,
    totalCards: 0,
    uniqueCards: 0,
    highRarityCount: 0,
    lastRefreshedAt: null,
  };
}

export async function loadSocialCollectionValueByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, CollectionValueCacheRow>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const { data, error } = await supabase.rpc("get_users_collection_value_batch", {
      p_user_ids: unique,
    });
    const out: Record<string, CollectionValueCacheRow> = {};
    for (const uid of unique) {
      out[uid] = emptyValueRow(uid);
    }
    if (error || !Array.isArray(data)) return out;
    for (const raw of data as Record<string, unknown>[]) {
      const uid = raw.user_id != null ? String(raw.user_id) : "";
      if (!uid) continue;
      out[uid] = {
        estimatedValueCents: Number(raw.estimated_value_cents ?? 0),
        totalCards: Number(raw.total_cards ?? 0),
        uniqueCards: Number(raw.unique_cards ?? 0),
        highRarityCount: Number(raw.high_rarity_count ?? 0),
        lastRefreshedAt: raw.last_refreshed_at != null ? String(raw.last_refreshed_at) : null,
      };
    }
    return out;
  } catch {
    return Object.fromEntries(unique.map((uid) => [uid, emptyValueRow(uid)]));
  }
}

export async function loadSocialGrailHighlightByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, GrailHighlightBatchRow>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const { data, error } = await supabase.rpc("get_users_grail_highlight_batch", {
      p_user_ids: unique,
    });
    const out: Record<string, GrailHighlightBatchRow> = {};
    for (const uid of unique) {
      out[uid] = { userId: uid, grailCount: 0, highlightName: null };
    }
    if (error || !Array.isArray(data)) return out;
    for (const raw of data as Record<string, unknown>[]) {
      const uid = raw.user_id != null ? String(raw.user_id) : "";
      if (!uid) continue;
      out[uid] = {
        userId: uid,
        grailCount: Number(raw.grail_count ?? 0),
        highlightName: raw.highlight_name != null ? String(raw.highlight_name) : null,
      };
    }
    return out;
  } catch {
    return Object.fromEntries(unique.map((uid) => [uid, { userId: uid, grailCount: 0, highlightName: null }]));
  }
}
