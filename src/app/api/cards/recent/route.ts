import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import type { CatalogCardHit } from "@/lib/dto/catalog";
import { setNameFromCatalogEmbed } from "@/lib/catalog/catalog-rows";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

type RecentCardRow = {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  catalog_card_id: string | null;
  catalog_cards:
    | {
        id: string;
        name: string;
        number: string;
        rarity: string | null;
        set_id: string;
        supertype: string | null;
        subtypes: string[];
        image_small: string | null;
        image_large: string | null;
        catalog_sets?: { name: string } | { name: string }[] | null;
      }
    | {
        id: string;
        name: string;
        number: string;
        rarity: string | null;
        set_id: string;
        supertype: string | null;
        subtypes: string[];
        image_small: string | null;
        image_large: string | null;
        catalog_sets?: { name: string } | { name: string }[] | null;
      }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function rowToHit(row: RecentCardRow): CatalogCardHit | null {
  const catalog = firstRelation(row.catalog_cards);
  if (catalog) {
    return {
      id: catalog.id,
      name: catalog.name,
      set_id: catalog.set_id,
      set: setNameFromCatalogEmbed(catalog.catalog_sets ?? null, catalog.set_id),
      number: catalog.number ?? "",
      rarity: catalog.rarity,
      image_url: catalog.image_large ?? catalog.image_small ?? row.image_url,
      supertype: catalog.supertype,
      subtypes: catalog.subtypes ?? [],
      tcgplayer_id: catalog.id,
    };
  }
  if (!row.catalog_card_id) return null;
  return {
    id: row.catalog_card_id,
    name: row.name,
    set: "",
    number: row.number ?? "",
    rarity: row.rarity,
    image_url: row.image_url,
  };
}

/** GET `?binderId=` optional — recently added cards for suggestions (binder-scoped + global). */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { searchParams } = new URL(request.url);
  const binderId = searchParams.get("binderId")?.trim() ?? searchParams.get("binder_id")?.trim() ?? "";
  const limitRaw = parseInt(searchParams.get("limit") ?? "12", 10);
  const limit = Math.min(24, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 12));

  const select =
    "id, name, number, rarity, image_url, catalog_card_id, catalog_cards(id, name, number, rarity, set_id, supertype, subtypes, image_small, image_large, catalog_sets(name))";

  const runQuery = async (scopedBinder: boolean) => {
    let qb = supabase
      .from("cards")
      .select(select)
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (scopedBinder && binderId) {
      qb = qb.eq("binder_id", binderId);
    }

    return qb;
  };

  const [binderRes, globalRes] = await Promise.all([
    binderId ? runQuery(true) : Promise.resolve({ data: [], error: null }),
    runQuery(false),
  ]);

  if (binderRes.error) {
    return errorJson(ctx, safePublicDbMessage(binderRes.error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }
  if (globalRes.error) {
    return errorJson(ctx, safePublicDbMessage(globalRes.error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }

  const binderRecent = ((binderRes.data as RecentCardRow[] | null) ?? [])
    .map(rowToHit)
    .filter((h): h is CatalogCardHit => h != null);
  const globalRecent = ((globalRes.data as RecentCardRow[] | null) ?? [])
    .map(rowToHit)
    .filter((h): h is CatalogCardHit => h != null);

  return successJson(ctx, { binderRecent, globalRecent });
}

export const GET = defineRouteSimple("GET /api/cards/recent", GET_handler);
