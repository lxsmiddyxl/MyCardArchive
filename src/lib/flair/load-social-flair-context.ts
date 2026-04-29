import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SocialFlairContextRow = {
  user_id: string;
  reputation_score: number;
  reputation_updated_at: string | null;
  streak_count: number;
  last_active_date: string | null;
  csv_export_count: number;
};

export async function loadSocialFlairContextByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, SocialFlairContextRow>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const { data, error } = await supabase.rpc("get_users_social_flair_context", {
    p_user_ids: unique,
  });
  if (error || !Array.isArray(data)) {
    return {};
  }
  const out: Record<string, SocialFlairContextRow> = {};
  for (const raw of data as Record<string, unknown>[]) {
    const uid = String(raw.user_id ?? "");
    if (!uid) continue;
    out[uid] = {
      user_id: uid,
      reputation_score: Number(raw.reputation_score ?? 0),
      reputation_updated_at:
        raw.reputation_updated_at != null ? String(raw.reputation_updated_at) : null,
      streak_count: Number(raw.streak_count ?? 0),
      last_active_date: raw.last_active_date != null ? String(raw.last_active_date) : null,
      csv_export_count: Number(raw.csv_export_count ?? 0),
    };
  }
  return out;
}
