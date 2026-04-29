import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** club_id list per user from `get_users_clubs_batch`. */
export async function loadSocialClubsByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, string[]>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) return {};
  try {
    const { data, error } = await supabase.rpc("get_users_clubs_batch", {
      p_user_ids: unique,
    });
    if (error || !Array.isArray(data)) return {};
    const out: Record<string, string[]> = {};
    for (const uid of unique) out[uid] = [];
    for (const row of data as { user_id?: string; club_id?: string }[]) {
      const uid = row.user_id;
      const cid = row.club_id;
      if (!uid || !cid) continue;
      if (!out[uid]) out[uid] = [];
      out[uid].push(String(cid));
    }
    return out;
  } catch {
    return {};
  }
}
