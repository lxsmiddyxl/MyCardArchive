import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadSeasonHighlightByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[],
  seasonYear: number,
  seasonId: string
): Promise<Record<string, string>> {
  const ids = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return {};
  const { data, error } = await supabase.rpc("get_users_season_highlight_batch", {
    p_user_ids: ids,
    p_year: seasonYear,
    p_season: seasonId,
  });
  if (error || !Array.isArray(data)) return {};
  const out: Record<string, string> = {};
  for (const row of data as { user_id?: string; highlight?: string }[]) {
    if (row.user_id && row.highlight?.trim()) out[row.user_id] = row.highlight.trim();
  }
  return out;
}

export async function loadYirViewedYearByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, number | null>> {
  const ids = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (ids.length === 0) return {};
  const { data, error } = await supabase.rpc("get_users_yir_viewed_batch", {
    p_user_ids: ids,
  });
  if (error || !Array.isArray(data)) return {};
  const out: Record<string, number | null> = {};
  for (const id of ids) out[id] = null;
  for (const row of data as { user_id?: string; last_viewed_year?: number | null }[]) {
    if (row.user_id != null && row.last_viewed_year != null) {
      out[row.user_id] = row.last_viewed_year;
    }
  }
  return out;
}
