import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: groups, error } = await supabase
    .from("binder_groups")
    .select("id, user_id, title, description, cover_url, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (error) return errorJson(ctx, error.message, 500);

  const ids = (groups ?? []).map((g) => g.id);
  const { data: items } = ids.length
    ? await supabase
        .from("binder_group_items")
        .select("id, group_id, binder_id, position, binders ( id, name, visibility )")
        .in("group_id", ids)
        .order("position", { ascending: true })
    : { data: [] };

  const byGroup = new Map<string, Array<Record<string, unknown>>>();
  for (const row of items ?? []) {
    const binder = row.binders as { id: string; name: string; visibility: string } | null;
    const list = byGroup.get(row.group_id) ?? [];
    list.push({
      id: row.id,
      binder_id: row.binder_id,
      position: row.position,
      binder_name: binder?.name ?? "Binder",
      visibility: binder?.visibility,
    });
    byGroup.set(row.group_id, list);
  }

  return successJson(ctx, {
    groups: (groups ?? []).map((g) => ({
      ...g,
      share_url: `/g/${g.id}`,
      items: byGroup.get(g.id) ?? [],
    })),
  });
}

export const GET = defineRouteNoArgs("GET /api/binder-groups/list", GET_handler);
