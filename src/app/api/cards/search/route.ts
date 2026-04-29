import {
  cacheKeyCardSearch,
  effectiveTtl,
  getCache,
  isCacheEnabled,
  setCache,
  ttlSearchMs,
} from "@/lib/cache";
import { markHotPathEnd, markHotPathStart } from "@/lib/perf/hot-paths";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 24;

type SearchCardRow = {
  id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  catalog_card_id: string | null;
  catalog_cards:
    | {
        supertype: string | null;
        set_id: string;
        rarity: string | null;
        catalog_sets: { id: string; name: string } | { id: string; name: string }[] | null;
      }
    | {
        supertype: string | null;
        set_id: string;
        rarity: string | null;
        catalog_sets: { id: string; name: string } | { id: string; name: string }[] | null;
      }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function escapeForIlike(s: string): string {
  return s.replace(/[%_]/g, "");
}

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const setId = (searchParams.get("set") ?? "").trim();
  const type = (searchParams.get("type") ?? "").trim();
  const rarity = (searchParams.get("rarity") ?? "").trim();
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(
    48,
    Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
  );

  const hpToken = markHotPathStart("hp:search:cards");
  try {
    const cacheKey = cacheKeyCardSearch(user.id, { q, setId, type, rarity, offset, limit });
    if (isCacheEnabled()) {
      const cached = getCache(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

  const end = offset + limit - 1;
  const selectCols = `id, name, number, rarity, image_url, catalog_card_id,
       catalog_cards(supertype, set_id, rarity, catalog_sets(id, name))`;

  type Mode = "plain" | "textsearch" | "ilike";

  const build = (mode: Mode) => {
    let qb = supabase
      .from("cards")
      .select(selectCols, { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, end);

    if (setId) {
      qb = qb.eq("catalog_cards.set_id", setId);
    }
    if (type) {
      qb = qb.eq("catalog_cards.supertype", type);
    }
    if (rarity) {
      qb = qb.ilike("rarity", `%${escapeForIlike(rarity)}%`);
    }

    if (mode === "textsearch" && q.length > 0) {
      qb = qb.textSearch("name_tsv", q, {
        type: "websearch",
        config: "english",
      });
    } else if (mode === "ilike" && q.length > 0) {
      qb = qb.ilike("name", `%${escapeForIlike(q).slice(0, 80)}%`);
    }

    return qb;
  };

  let result =
    q.length === 0
      ? await build("plain")
      : await build("textsearch");

  if (
    q.length > 0 &&
    result.error &&
    (result.error.message.includes("name_tsv") ||
      result.error.message.includes("does not exist"))
  ) {
    result = await build("ilike");
  } else if (q.length > 0 && result.error) {
    result = await build("ilike");
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const rows = ((result.data ?? []) as unknown as SearchCardRow[]).map((row) => {
    const cc = firstRelation(row.catalog_cards);
    const cs = firstRelation(cc?.catalog_sets ?? null);
    return {
      id: row.id,
      name: row.name,
      number: row.number,
      rarity: row.rarity ?? cc?.rarity ?? null,
      image_url: row.image_url,
      catalog_card_id: row.catalog_card_id,
      set: cs?.name ?? cc?.set_id ?? null,
      type: cc?.supertype ?? null,
    };
  });

  const total = result.count ?? rows.length;

  const body = {
    cards: rows,
    total,
    offset,
    limit,
    hasMore: offset + rows.length < total,
  };
  if (isCacheEnabled()) {
    setCache(cacheKey, body, effectiveTtl(ttlSearchMs()));
  }
  return NextResponse.json(body);
  } finally {
    markHotPathEnd(hpToken);
  }
}

export const GET = defineRouteSimple("GET /api/cards/search", GET_handler);
