import { defineRouteNoArgs } from "@/lib/server/api-route";
import { successJson, withContextId } from "@/lib/api/route-helpers";
import { createClient } from "@/lib/supabase/route";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();

  const { data: trending } = await supabase
    .from("binders")
    .select("id, name, description, visibility, user_id, updated_at")
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(12);

  const { data: recentActivity } = await supabase
    .from("binder_activity")
    .select("binder_id, created_at, type")
    .order("created_at", { ascending: false })
    .limit(40);

  const activityBinderIds = [
    ...new Set((recentActivity ?? []).map((a) => a.binder_id)),
  ].slice(0, 12);

  let recentlyUpdated = trending ?? [];
  if (activityBinderIds.length > 0) {
    const { data: fromActivity } = await supabase
      .from("binders")
      .select("id, name, description, visibility, user_id, updated_at")
      .eq("visibility", "public")
      .in("id", activityBinderIds);
    if (fromActivity?.length) {
      const map = new Map((fromActivity ?? []).map((b) => [b.id, b]));
      recentlyUpdated = activityBinderIds
        .map((id) => map.get(id))
        .filter((b): b is NonNullable<typeof b> => Boolean(b));
    }
  }

  const ownerIds = [
    ...new Set([
      ...(trending ?? []).map((b) => b.user_id),
      ...recentlyUpdated.map((b) => b.user_id),
    ]),
  ];

  const { data: profiles } = ownerIds.length
    ? await supabase
        .from("social_public_profiles")
        .select("user_id, display_name, handle, username")
        .in("user_id", ownerIds)
    : { data: [] };

  const ownerMap = new Map(
    (profiles ?? []).map((p) => [
      p.user_id,
      {
        display: p.display_name?.trim() || p.username?.trim() || "Collector",
        handle: p.handle?.trim() ?? null,
      },
    ])
  );

  const enrich = (rows: typeof trending) =>
    (rows ?? []).map((b) => ({
      ...b,
      share_url: `/b/${b.id}`,
      owner_display: ownerMap.get(b.user_id)?.display ?? "Collector",
      owner_handle: ownerMap.get(b.user_id)?.handle ?? null,
    }));

  return successJson(ctx, {
    trending: enrich(trending),
    recently_updated: enrich(recentlyUpdated),
  });
}

export const GET = defineRouteNoArgs("GET /api/explore/binders", GET_handler);
