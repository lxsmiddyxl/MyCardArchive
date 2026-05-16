import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: rows, error } = await supabase
    .from("profile_showcase_items")
    .select("id, user_id, binder_id, group_id, position, created_at")
    .eq("user_id", session.userId)
    .order("position", { ascending: true });

  if (error) return errorJson(ctx, error.message, 500);

  const binderIds = (rows ?? []).map((r) => r.binder_id).filter(Boolean) as string[];
  const groupIds = (rows ?? []).map((r) => r.group_id).filter(Boolean) as string[];

  const [{ data: binders }, { data: groups }] = await Promise.all([
    binderIds.length
      ? supabase.from("binders").select("id, name, visibility").in("id", binderIds)
      : Promise.resolve({ data: [] }),
    groupIds.length
      ? supabase.from("binder_groups").select("id, title").in("id", groupIds)
      : Promise.resolve({ data: [] }),
  ]);

  const binderMap = new Map((binders ?? []).map((b) => [b.id, b]));
  const groupMap = new Map((groups ?? []).map((g) => [g.id, g]));

  return successJson(ctx, {
    items: (rows ?? []).map((r) => ({
      ...r,
      binder_name: r.binder_id ? binderMap.get(r.binder_id)?.name ?? null : null,
      group_title: r.group_id ? groupMap.get(r.group_id)?.title ?? null : null,
      share_url: r.binder_id ? `/b/${r.binder_id}` : r.group_id ? `/g/${r.group_id}` : null,
    })),
  });
}

export const GET = defineRouteNoArgs("GET /api/profile/showcase", GET_handler);
