import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { mapShowcaseRowToPublicV1 } from "@/lib/showcases/map-showcase-public";
import { isShowcaseFeaturedFromDescription } from "@/lib/showcases/showcase-featured-meta";

export type ProfileV3EcosystemStatsDTO = {
  trades_completed: number;
  showcases_total: number;
  community_posts: number;
  featured_showcase_id: string | null;
};

export async function loadProfileV3EcosystemStats(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<{ ok: true; stats: ProfileV3EcosystemStatsDTO } | { ok: false; message: string }> {
  const [tradesRes, showcasesRes, postsRes] = await Promise.all([
    supabase
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .or(`created_by.eq.${userId},counterparty_id.eq.${userId}`),
    supabase.from("collection_showcases").select("*").eq("user_id", userId),
    supabase.from("community_posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
  ]);

  if (tradesRes.error || showcasesRes.error || postsRes.error) {
    const msg = tradesRes.error?.message ?? showcasesRes.error?.message ?? postsRes.error?.message ?? "query";
    return { ok: false, message: msg };
  }

  const showcases = showcasesRes.data ?? [];
  const featured = showcases.find((r) => isShowcaseFeaturedFromDescription(r.description));
  const featuredPublic = featured ? mapShowcaseRowToPublicV1(featured) : null;

  return {
    ok: true,
    stats: {
      trades_completed: tradesRes.count ?? 0,
      showcases_total: showcases.length,
      community_posts: postsRes.count ?? 0,
      featured_showcase_id: featuredPublic?.id ?? null,
    },
  };
}
