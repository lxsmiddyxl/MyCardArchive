import { errorJson, successJson } from "@/lib/api/route-helpers";
import { isBinderShareable, parseBinderVisibility } from "@/lib/binders/binder-social-types";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

async function GET_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const binderId = params.binderId?.trim() ?? "";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: binder } = await supabase
    .from("binders")
    .select("id, user_id, visibility")
    .eq("id", binderId)
    .maybeSingle();

  const ctx = { contextId: "binder-links", startedAt: Date.now() } as const;
  if (!binder) return errorJson(ctx, "Binder not found", 404);

  const isOwner = Boolean(user?.id && user.id === binder.user_id);
  const shareable = isBinderShareable(parseBinderVisibility(binder.visibility));
  if (!isOwner && !shareable) {
    return errorJson(ctx, "Forbidden", 403);
  }

  const { data: links } = await supabase
    .from("binder_links")
    .select("id, binder_id, target_binder_id, label, created_at")
    .eq("binder_id", binderId)
    .order("created_at", { ascending: true });

  const targetIds = (links ?? []).map((l) => l.target_binder_id);
  const { data: targets } = targetIds.length
    ? await supabase.from("binders").select("id, name, visibility").in("id", targetIds)
    : { data: [] };

  const targetMap = new Map((targets ?? []).map((t) => [t.id, t]));

  return successJson(ctx, {
    links: (links ?? []).map((l) => ({
      ...l,
      target_name: targetMap.get(l.target_binder_id)?.name ?? "Binder",
      target_visibility: targetMap.get(l.target_binder_id)?.visibility,
      share_url: `/b/${l.target_binder_id}`,
    })),
  });
}

export const GET = defineRoute("GET /api/binders/[binderId]/links", GET_handler);
