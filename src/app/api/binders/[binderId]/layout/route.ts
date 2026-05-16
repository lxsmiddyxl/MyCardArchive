import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import { BINDER_SLOTS_PER_PAGE } from "@/lib/binders/constants";
import { getMaxBinderPagesForUser } from "@/lib/binders/page-limits";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import { applyLayoutAssignments } from "@/lib/binders/binder-slot-ops";
import { defineRoute } from "@/lib/server/api-route";
import {
  computeAutoLayoutAssignments,
  pageCountForAssignments,
  type LayoutMode,
} from "@/mca-utils/binders/autoLayout";

const MODES = new Set<LayoutMode>(["number", "rarity", "set", "custom"]);

async function POST_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const resolved = await resolveBinderRouteSession(params.binderId);
  if (!resolved.ok) return resolved.response;

  const { ctx, supabase, userId, binderId } = resolved.session;

  let body: { mode?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const modeRaw = (body.mode ?? "number").trim().toLowerCase();
  const mode = MODES.has(modeRaw as LayoutMode) ? (modeRaw as LayoutMode) : "number";

  if (mode === "custom") {
    return successJson(ctx, { ok: true, mode, assignments: 0 });
  }

  const { data: cards, error: cErr } = await supabase
    .from("cards")
    .select(
      `
      id,
      number,
      rarity,
      catalog_cards (
        set_id,
        catalog_sets ( name )
      )
    `
    )
    .eq("binder_id", binderId)
    .eq("user_id", userId);

  if (cErr) {
    return errorJson(ctx, cErr.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  const layoutCards = (cards ?? []).map((c) => {
    const cc = Array.isArray(c.catalog_cards) ? c.catalog_cards[0] : c.catalog_cards;
    const setRow = cc?.catalog_sets;
    const setName =
      setRow && typeof setRow === "object" && !Array.isArray(setRow)
        ? setRow.name
        : Array.isArray(setRow)
          ? setRow[0]?.name
          : null;
    return {
      id: c.id,
      number: c.number,
      rarity: c.rarity,
      set_id: cc?.set_id ?? null,
      set_name: setName ?? null,
    };
  });

  const assignments = computeAutoLayoutAssignments(layoutCards, mode);
  const neededPages = pageCountForAssignments(assignments);
  const maxPages = await getMaxBinderPagesForUser(supabase);

  if (neededPages > maxPages) {
    return errorJson(
      ctx,
      `Auto-layout needs ${neededPages} pages but your tier allows ${maxPages}`,
      403,
      { code: ApiErrorCode.BAD_REQUEST }
    );
  }

  const { data: existingPages } = await supabase
    .from("binder_slots")
    .select("page_number")
    .eq("binder_id", binderId);

  const maxExisting =
    (existingPages ?? []).reduce(
      (m, r) => (typeof r.page_number === "number" ? Math.max(m, r.page_number) : m),
      -1
    ) + 1;

  for (let p = maxExisting; p < neededPages; p++) {
    const rows = Array.from({ length: BINDER_SLOTS_PER_PAGE }, (_, slot_index) => ({
      binder_id: binderId,
      page_number: p,
      slot_index,
      card_id: null,
    }));
    await supabase.from("binder_slots").upsert(rows, {
      onConflict: "binder_id,page_number,slot_index",
    });
  }

  await supabase
    .from("binder_slots")
    .update({ card_id: null })
    .eq("binder_id", binderId);

  const applied = await applyLayoutAssignments(supabase, binderId, assignments);
  if (!applied.ok) {
    return errorJson(ctx, applied.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, {
    ok: true,
    mode,
    assignments: assignments.length,
    pages: neededPages,
    duration_ms: Date.now() - ctx.startedAt,
  });
}

export const POST = defineRoute("POST /api/binders/[binderId]/layout", POST_handler);
