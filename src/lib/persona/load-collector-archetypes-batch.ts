import type { Database } from "@/lib/supabase/types";
import type { ArchetypeFitRow } from "@/lib/persona/persona-v2";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Loads qualitative archetype fits for flair enrichment (no taste vectors). */
export async function loadCollectorArchetypesByUserIds(
  supabase: SupabaseClient<Database>,
  userIds: string[]
): Promise<Record<string, ArchetypeFitRow[]>> {
  const unique = [...new Set(userIds.map((x) => x.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return {};
  }
  const { data, error } = await supabase.rpc("get_users_archetypes_batch", {
    p_user_ids: unique,
  });
  if (error || !Array.isArray(data)) {
    return Object.fromEntries(unique.map((id) => [id, [] as ArchetypeFitRow[]]));
  }
  const byUser = new Map<string, ArchetypeFitRow[]>();
  for (const id of unique) {
    byUser.set(id, []);
  }
  for (const raw of data as Record<string, unknown>[]) {
    const uid = String(raw.user_id ?? "");
    if (!uid) continue;
    const row: ArchetypeFitRow = {
      archetype_id: String(raw.archetype_id ?? ""),
      label: String(raw.label ?? ""),
      description: raw.description != null ? String(raw.description) : null,
      icon_key: raw.icon_key != null ? String(raw.icon_key) : null,
      confidence_band: String(raw.confidence_band ?? ""),
    };
    const cur = byUser.get(uid) ?? [];
    cur.push(row);
    byUser.set(uid, cur);
  }
  return Object.fromEntries(unique.map((id) => [id, byUser.get(id) ?? []]));
}
