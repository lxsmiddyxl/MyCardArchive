import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SeasonalEventContextRow = {
  user_id: string;
  top_seasonal_badge_key: string | null;
  seasonal_badge_keys: string[];
};

export async function loadSeasonalEventContextByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, SeasonalEventContextRow>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const { data, error } = await supabase.rpc("get_users_seasonal_event_context", {
    p_user_ids: unique,
  });
  if (error || !Array.isArray(data)) {
    return {};
  }
  const out: Record<string, SeasonalEventContextRow> = {};
  for (const raw of data as Record<string, unknown>[]) {
    const uid = String(raw.user_id ?? "");
    if (!uid) continue;
    const keysRaw = raw.seasonal_badge_keys;
    const keys = Array.isArray(keysRaw) ? keysRaw.map((x) => String(x)) : [];
    out[uid] = {
      user_id: uid,
      top_seasonal_badge_key:
        raw.top_seasonal_badge_key != null ? String(raw.top_seasonal_badge_key) : null,
      seasonal_badge_keys: keys,
    };
  }
  return out;
}
