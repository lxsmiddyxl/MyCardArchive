import type { Database } from "@/lib/supabase/types";
import { parseIdentityMapJson, type IdentityMapPublic } from "@/lib/identity/collector-identity-map";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function loadCollectorIdentityMapByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, IdentityMapPublic>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const { data, error } = await supabase.rpc("get_users_identity_map_batch", {
    p_user_ids: unique,
  });
  const empty = (): IdentityMapPublic => parseIdentityMapJson(null);
  if (error || !Array.isArray(data)) {
    return Object.fromEntries(unique.map((id) => [id, empty()]));
  }
  const byUser = new Map<string, IdentityMapPublic>();
  for (const id of unique) {
    byUser.set(id, empty());
  }
  for (const raw of data as { user_id?: string; identity?: unknown }[]) {
    const uid = String(raw.user_id ?? "");
    if (!uid) continue;
    byUser.set(uid, parseIdentityMapJson(raw.identity));
  }
  return Object.fromEntries(unique.map((id) => [id, byUser.get(id) ?? empty()]));
}
