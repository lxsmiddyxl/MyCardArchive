import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: collections, error } = await supabase
    .from("binder_collections")
    .select("id, user_id, name, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return errorJson(ctx, error.message, 500);
  }

  const ids = (collections ?? []).map((c) => c.id);
  const { data: items } = ids.length
    ? await supabase
        .from("binder_collection_items")
        .select("id, collection_id, binder_id, position, binders ( id, name )")
        .in("collection_id", ids)
        .order("position", { ascending: true })
    : { data: [] };

  const byCollection = new Map<string, Array<Record<string, unknown>>>();
  for (const row of items ?? []) {
    const binder = row.binders as { id: string; name: string } | null;
    const list = byCollection.get(row.collection_id) ?? [];
    list.push({
      id: row.id,
      binder_id: row.binder_id,
      position: row.position,
      binder_name: binder?.name ?? "Binder",
    });
    byCollection.set(row.collection_id, list);
  }

  return successJson(ctx, {
    collections: (collections ?? []).map((c) => ({
      ...c,
      items: byCollection.get(c.id) ?? [],
    })),
  });
}

export const GET = defineRouteNoArgs("GET /api/binder-collections/list", GET_handler);
