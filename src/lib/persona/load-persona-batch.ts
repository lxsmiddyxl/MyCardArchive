import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Server-side read of cached persona lines (no client synthesis). */
export async function loadSocialPersonaByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, string | null>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const { data, error } = await supabase.rpc("get_users_persona_batch", {
    p_user_ids: unique,
  });
  if (error || !Array.isArray(data)) {
    return Object.fromEntries(unique.map((id) => [id, null as string | null]));
  }
  const out: Record<string, string | null> = Object.fromEntries(
    unique.map((id) => [id, null as string | null])
  );
  for (const raw of data as { user_id?: string; persona_text?: string | null }[]) {
    const uid = String(raw.user_id ?? "");
    if (!uid) continue;
    const t = raw.persona_text;
    out[uid] = t != null && String(t).trim().length > 0 ? String(t).trim() : null;
  }
  return out;
}
