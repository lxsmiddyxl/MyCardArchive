import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Highest scan-milestone badge_key per user (for inline social UI).
 */
export async function loadTopScanMilestonesByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, string | null>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const { data, error } = await supabase.rpc("get_users_top_scan_milestones", {
    p_user_ids: unique,
  });
  if (error || !Array.isArray(data)) {
    return {};
  }
  const out: Record<string, string | null> = {};
  for (const row of data as { user_id: string; badge_key: string }[]) {
    if (row.user_id && row.badge_key) {
      out[row.user_id] = row.badge_key;
    }
  }
  return out;
}
