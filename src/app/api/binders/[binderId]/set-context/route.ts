import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import {
  buildRarityDistribution,
  isRareForBinder,
  normalizeRarityBucket,
  type BinderRarityDistribution,
  type RarityBucket,
} from "@/lib/catalog/binder-rarity-hints";
import { computeSetCompletion } from "@/lib/catalog/set-progress";
import { defineRoute } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

/** GET `?setId=&catalog_card_id=` optional — set completion + binder rarity distribution. */
async function GET_handler(
  request: Request,
  { params }: { params: Record<string, string> }
) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const binderId = params.binderId?.trim() ?? "";
  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId")?.trim() ?? searchParams.get("set_id")?.trim() ?? "";
  const catalogCardId = searchParams.get("catalog_card_id")?.trim() ?? "";

  if (!binderId || !setId) {
    return errorJson(ctx, "binderId (path) and setId are required", 400, {
      code: ApiErrorCode.BAD_REQUEST,
    });
  }

  const { data: binder, error: binderErr } = await supabase
    .from("binders")
    .select("id")
    .eq("id", binderId)
    .eq("user_id", session.userId)
    .maybeSingle();

  if (binderErr) {
    return errorJson(ctx, safePublicDbMessage(binderErr.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }
  if (!binder) {
    return errorJson(ctx, "Binder not found", 404);
  }

  const { count: total, error: totalErr } = await supabase
    .from("catalog_cards")
    .select("id", { count: "exact", head: true })
    .eq("set_id", setId);

  if (totalErr) {
    return errorJson(ctx, safePublicDbMessage(totalErr.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }

  const { data: setCards, error: setCardsErr } = await supabase
    .from("catalog_cards")
    .select("id")
    .eq("set_id", setId);

  if (setCardsErr) {
    return errorJson(ctx, safePublicDbMessage(setCardsErr.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }

  const setIds = (setCards ?? []).map((c) => c.id);
  let ownedInSet = 0;
  let rarities: (string | null)[] = [];

  if (setIds.length > 0) {
    const { data: owned, error: ownedErr } = await supabase
      .from("cards")
      .select("catalog_card_id, rarity")
      .eq("binder_id", binderId)
      .eq("user_id", session.userId)
      .in("catalog_card_id", setIds);

    if (ownedErr) {
      return errorJson(ctx, safePublicDbMessage(ownedErr.message), 500, {
        code: ApiErrorCode.SUPABASE_QUERY,
      });
    }
    ownedInSet = (owned ?? []).length;
    rarities = (owned ?? []).map((r) => r.rarity);
  }

  const setProgress = computeSetCompletion(ownedInSet, total ?? 0);
  const distribution: BinderRarityDistribution = buildRarityDistribution(rarities);

  let selectedRarity: string | null = null;
  let rareForBinder = false;
  if (catalogCardId) {
    const { data: cat } = await supabase
      .from("catalog_cards")
      .select("rarity")
      .eq("id", catalogCardId)
      .maybeSingle();
    selectedRarity = cat?.rarity ?? null;
    rareForBinder = isRareForBinder(selectedRarity, distribution);
  }

  const distributionList = (Object.keys(distribution) as RarityBucket[])
    .filter((k) => distribution[k] > 0)
    .map((k) => ({ bucket: k, count: distribution[k] }));

  return successJson(ctx, {
    set_id: setId,
    set_progress: setProgress,
    rarity_distribution: distribution,
    rarity_distribution_list: distributionList,
    rare_for_binder: rareForBinder,
    selected_rarity_bucket: selectedRarity
      ? normalizeRarityBucket(selectedRarity)
      : null,
  });
}

export const GET = defineRoute("GET /api/binders/[binderId]/set-context", GET_handler);
