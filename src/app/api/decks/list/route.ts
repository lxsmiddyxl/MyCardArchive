import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import {
  cacheKeyDecksList,
  effectiveTtl,
  getCache,
  isCacheEnabled,
  setCache,
  ttlCollectionMs,
} from "@/lib/cache";
import { markHotPathEnd, markHotPathStart } from "@/lib/perf/hot-paths";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const hpToken = markHotPathStart("hp:collection:listViewport");
  try {
    const cacheKey = cacheKeyDecksList(session.userId);
    if (isCacheEnabled()) {
      const cached = getCache(cacheKey) as { decks?: unknown[] } | undefined;
      if (cached && Array.isArray(cached.decks)) {
        return successJson(ctx, { decks: cached.decks });
      }
    }

    const { data, error } = await supabase
      .from("decks")
      .select("*")
      .eq("user_id", session.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return errorJson(ctx, safePublicDbMessage(error.message), 500);
    }

    const body = { decks: data ?? [] };
    if (isCacheEnabled()) {
      setCache(cacheKey, body, effectiveTtl(ttlCollectionMs()));
    }
    return successJson(ctx, body);
  } finally {
    markHotPathEnd(hpToken);
  }
}

export const GET = defineRouteNoArgs("GET /api/decks/list", GET_handler);
