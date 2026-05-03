import type { Database } from "@/lib/supabase/types";
import {
  parseSocialGraphV4Narrative,
  type SocialGraphV4Narrative,
} from "@/lib/social/social-graph-v4";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadSocialGraphV4ByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, SocialGraphV4Narrative>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const { data, error } = await supabase.rpc("get_users_social_graph_v4_batch", {
    p_user_ids: unique,
  });
  const empty = (): SocialGraphV4Narrative => parseSocialGraphV4Narrative(null);
  if (error || !Array.isArray(data)) {
    return Object.fromEntries(unique.map((id) => [id, empty()]));
  }
  const byUser = new Map<string, SocialGraphV4Narrative>();
  for (const id of unique) {
    byUser.set(id, empty());
  }
  for (const raw of data as { user_id?: string; narrative?: unknown }[]) {
    const uid = String(raw.user_id ?? "");
    if (!uid) continue;
    byUser.set(uid, parseSocialGraphV4Narrative(raw.narrative));
  }
  return Object.fromEntries(unique.map((id) => [id, byUser.get(id) ?? empty()]));
}
