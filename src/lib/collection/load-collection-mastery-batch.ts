import type { CollectionMasteryDbRow } from "@/lib/collection/collection-mastery-merge";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RpcRow = {
  user_id: string;
  mastery_type: string;
  mastery_key: string;
  completed_count: number;
  is_complete: boolean;
  completed_at: string | null;
};

export async function loadSocialCollectionMasteryByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, CollectionMasteryDbRow[]>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const { data, error } = await supabase.rpc("get_users_collection_mastery_batch", {
    p_user_ids: unique,
  });
  if (error || !Array.isArray(data)) {
    return Object.fromEntries(unique.map((id) => [id, [] as CollectionMasteryDbRow[]]));
  }
  const byUser: Record<string, CollectionMasteryDbRow[]> = Object.fromEntries(
    unique.map((id) => [id, [] as CollectionMasteryDbRow[]])
  );
  for (const raw of data as RpcRow[]) {
    const uid = String(raw.user_id);
    if (!byUser[uid]) continue;
    const mt = raw.mastery_type === "set" ? "set" : "binder";
    byUser[uid].push({
      mastery_type: mt,
      mastery_key: String(raw.mastery_key),
      completed_count: Number(raw.completed_count),
      is_complete: Boolean(raw.is_complete),
      completed_at: raw.completed_at != null ? String(raw.completed_at) : null,
    });
  }
  return byUser;
}
