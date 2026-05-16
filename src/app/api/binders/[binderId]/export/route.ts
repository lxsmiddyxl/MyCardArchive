import { errorJson } from "@/lib/api/route-helpers";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import { getBinderInsights } from "@/mca-utils/binders/getBinderInsights";
import { buildBinderExportHtml } from "@/mca-utils/binders/exportHtml";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function POST_handler(
  _request: Request,
  { params }: { params: Record<string, string> }
) {
  const resolved = await resolveBinderRouteSession(params.binderId);
  if (!resolved.ok) return resolved.response;

  const { ctx, supabase, userId, binderId } = resolved.session;

  const { data: binder } = await supabase
    .from("binders")
    .select("id, name, description")
    .eq("id", binderId)
    .maybeSingle();

  if (!binder) return errorJson(ctx, "Binder not found", 404);

  const insights = await getBinderInsights(supabase, binderId, userId);

  const { data: slotRows } = await supabase
    .from("binder_slots")
    .select("page_number, slot_index, card_id, cards ( name, image_url )")
    .eq("binder_id", binderId)
    .order("page_number")
    .order("slot_index");

  const { data: linkRows } = await supabase
    .from("binder_links")
    .select("label, target_binder_id")
    .eq("binder_id", binderId);

  const targetIds = (linkRows ?? []).map((l) => l.target_binder_id);
  const { data: linkTargets } = targetIds.length
    ? await supabase.from("binders").select("id, name").in("id", targetIds)
    : { data: [] };
  const targetNameMap = new Map((linkTargets ?? []).map((t) => [t.id, t.name]));

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", userId)
    .maybeSingle();

  const ownerDisplay =
    profile?.display_name?.trim() || profile?.username?.trim() || "Collector";

  const html = buildBinderExportHtml({
    binderId,
    name: binder.name,
    description: binder.description,
    ownerDisplay,
    insights,
    slots: (slotRows ?? []).map((row) => {
      const card = row.cards as { name: string; image_url: string | null } | null;
      return {
        page: row.page_number,
        slot_index: row.slot_index,
        name: card?.name ?? null,
        image_url: card?.image_url ?? null,
      };
    }),
    links: (linkRows ?? []).map((l) => ({
      label: l.label,
      target_binder_id: l.target_binder_id,
      target_name: targetNameMap.get(l.target_binder_id) ?? "Binder",
    })),
  });

  const filename = `${binder.name.replace(/[^a-z0-9-_]+/gi, "-").slice(0, 40) || "binder"}.html`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export const POST = defineRoute("POST /api/binders/[binderId]/export", POST_handler);
