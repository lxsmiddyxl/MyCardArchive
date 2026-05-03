import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import type { BinderSlotsListPayloadDTO } from "@/lib/dto/binder";
import { getMaxBinderPagesForUser } from "@/lib/binders/page-limits";
import { PRIVATE_SHORT_CACHE_HEADERS } from "@/lib/server/private-cache-control";
import { defineRoute } from "@/lib/server/api-route";
import { withQueryTiming } from "@/lib/server/query-timing";
import { withSupabaseCall } from "@/lib/server/supabase-call";
import { createClient } from "@/lib/supabase/route";
export const dynamic = "force-dynamic";

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  return withQueryTiming("GET /api/binders/[binderId]/slots/list", async () => {
  const ctx = withContextId();
  try {
    const supabase = createClient();
    const session = await validateSession(supabase, ctx);
    if (!session.ok) return session.response;

    const binderId = context.params.binderId?.trim();
    if (!binderId) {
      return errorJson(ctx, "Invalid binder id", 400);
    }

    const { data: binder, error: bErr } = await withSupabaseCall(
      "binder_slots ownership",
      () =>
        supabase
          .from("binders")
          .select("id")
          .eq("id", binderId)
          .eq("user_id", session.userId)
          .maybeSingle()
    );

    if (bErr) {
      return errorJson(ctx, bErr.message, 500);
    }
    if (!binder) {
      return errorJson(ctx, "Binder not found", 404);
    }

    const maxPages = await getMaxBinderPagesForUser(supabase);

    const { data: rows, error } = await withSupabaseCall(
      "binder_slots list",
      () =>
        supabase
          .from("binder_slots")
          .select(
            `
      id,
      binder_id,
      page_number,
      slot_index,
      card_id,
      created_at,
      cards (
        id,
        name,
        image_url,
        rarity,
        number,
        binder_id
      )
    `
          )
          .eq("binder_id", binderId)
          .order("page_number", { ascending: true })
          .order("slot_index", { ascending: true })
    );

    if (error) {
      return errorJson(ctx, error.message, 500);
    }

    const pages: Record<
      string,
      {
        id: string;
        binder_id: string;
        page_number: number;
        slot_index: number;
        card_id: string | null;
        created_at: string;
        card: {
          id: string;
          name: string;
          image_url: string | null;
          rarity: string | null;
          number: string | null;
          binder_id: string;
        } | null;
      }[]
    > = {};

    for (const row of rows ?? []) {
      const p = String(row.page_number);
      if (!pages[p]) pages[p] = [];
      const cardsRel = row.cards as
        | {
            id: string;
            name: string;
            image_url: string | null;
            rarity: string | null;
            number: string | null;
            binder_id: string;
          }
        | {
            id: string;
            name: string;
            image_url: string | null;
            rarity: string | null;
            number: string | null;
            binder_id: string;
          }[]
        | null;
      const card = Array.isArray(cardsRel) ? (cardsRel[0] ?? null) : cardsRel;
      const cardOut = card
        ? {
            ...card,
            image_front_thumb_url: card.image_url,
          }
        : null;
      pages[p].push({
        id: row.id,
        binder_id: row.binder_id,
        page_number: row.page_number,
        slot_index: row.slot_index,
        card_id: row.card_id,
        created_at: row.created_at,
        card: cardOut,
      });
    }

    const pageNumbers = Object.keys(pages)
      .map((k) => parseInt(k, 10))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    const body: BinderSlotsListPayloadDTO = { pages, maxPages, pageNumbers };
    return successJson(ctx, body, { headers: PRIVATE_SHORT_CACHE_HEADERS });
  } catch {
    return errorJson(ctx, "Server error", 500);
  }
  });
}

export const GET = defineRoute("GET /api/binders/[binderId]/slots/list", GET_handler);
