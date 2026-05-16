import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson } from "@/lib/api/route-helpers";
import { resolveBinderRouteSession } from "@/lib/binders/binder-route-context";
import { defineRoute } from "@/lib/server/api-route";
import {
  getBinderMissingCards,
  type MissingCardsSort,
} from "@/mca-utils/binders/getBinderInsights";

const SORT_VALUES = new Set<MissingCardsSort>(["number", "rarity", "name"]);

function parseSort(raw: string | null): MissingCardsSort {
  const s = (raw ?? "number").trim().toLowerCase();
  if (SORT_VALUES.has(s as MissingCardsSort)) return s as MissingCardsSort;
  return "number";
}

async function GET_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const resolved = await resolveBinderRouteSession(params.binderId);
  if (!resolved.ok) return resolved.response;

  const { ctx, supabase, userId, binderId } = resolved.session;
  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId")?.trim() ?? searchParams.get("set_id")?.trim() ?? "";
  const sort = parseSort(searchParams.get("sort"));

  const result = await getBinderMissingCards(supabase, binderId, userId, {
    setId: setId || undefined,
    sort,
  });

  if (!result) {
    return errorJson(ctx, "Binder not found", 404, { code: ApiErrorCode.NOT_FOUND });
  }

  return successJson(ctx, result);
}

export const GET = defineRoute("GET /api/binders/[binderId]/missing", GET_handler);
