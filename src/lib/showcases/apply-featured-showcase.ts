import type { SupabaseClient } from "@supabase/supabase-js";
import { withShowcaseFeaturedDescription } from "@/lib/showcases/showcase-featured-meta";

/** At most one featured showcase per user — uses description machine line (Phase 72). */
export async function applyExclusiveFeaturedShowcase(
  supabase: SupabaseClient,
  userId: string,
  featuredId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: rows, error } = await supabase
    .from("collection_showcases")
    .select("id, description")
    .eq("user_id", userId);
  if (error) return { ok: false, message: error.message };
  const list = rows ?? [];
  if (!list.some((r) => r.id === featuredId)) {
    return { ok: false, message: "Showcase not found" };
  }
  const now = new Date().toISOString();
  const updates = list.map((r) => {
    const next = withShowcaseFeaturedDescription(r.description, r.id === featuredId);
    return supabase.from("collection_showcases").update({ description: next, updated_at: now }).eq("id", r.id);
  });
  const results = await Promise.all(updates);
  const firstErr = results.find((r) => r.error);
  if (firstErr?.error) return { ok: false, message: firstErr.error.message };
  return { ok: true };
}
