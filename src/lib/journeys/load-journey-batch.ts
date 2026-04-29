import type { JourneyProgressDbRow } from "@/lib/journeys/journey-catalog";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type RpcJourneyRow = {
  user_id: string;
  journey_id: string;
  completed_steps: number;
  is_complete: boolean;
  completed_at: string | null;
};

export async function loadSocialJourneyProgressByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, JourneyProgressDbRow[]>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const { data, error } = await supabase.rpc("get_users_journey_progress_batch", {
    p_user_ids: unique,
  });
  if (error || !Array.isArray(data)) {
    return Object.fromEntries(unique.map((id) => [id, [] as JourneyProgressDbRow[]]));
  }
  const byUser: Record<string, JourneyProgressDbRow[]> = Object.fromEntries(
    unique.map((id) => [id, [] as JourneyProgressDbRow[]])
  );
  for (const raw of data as RpcJourneyRow[]) {
    const uid = String(raw.user_id);
    if (!byUser[uid]) continue;
    byUser[uid].push({
      journey_id: String(raw.journey_id),
      completed_steps: Number(raw.completed_steps),
      is_complete: Boolean(raw.is_complete),
      completed_at: raw.completed_at != null ? String(raw.completed_at) : null,
    });
  }
  return byUser;
}
