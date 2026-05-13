import {
  cacheKeyCommunityFeedV1,
  effectiveTtl,
  getCache,
  isCacheEnabled,
  setCache,
  ttlCommunityFeedMs,
} from "@/lib/cache";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { snippetForCommunityFeedV1 } from "@/lib/community/feed-v1-filters";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";

const CTX = { componentName: "api/community/feed/v1", surfaceName: "community.feed" } as const;

export const dynamic = "force-dynamic";

/** Read-only, paginated community feed with server-side snippet filtering (Phase 63 + Phase 68 cache). */
async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get("limit") ?? "16", 10)));
  const offset = Math.min(5000, Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10)));
  const authorFilter = url.searchParams.get("author_id")?.trim();
  if (authorFilter && !isUuidString(authorFilter)) {
    return errorJson(ctx, "Invalid author_id", 400);
  }

  const authorKey = authorFilter ?? "all";
  const cacheKey = cacheKeyCommunityFeedV1(session.userId, { limit, offset, authorKey });
  if (isCacheEnabled()) {
    const hit = getCache(cacheKey);
    if (hit) {
      return successJson(ctx, hit as { items: unknown[]; next_offset: number });
    }
  }

  let q = supabase.from("community_posts").select("id, body, created_at, author_id");
  if (authorFilter) {
    q = q.eq("author_id", authorFilter);
  }
  const { data: posts, error } = await q
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500);
  }

  const rows = posts ?? [];
  const items = rows.map((p) => ({
    id: p.id,
    author_id: p.author_id,
    created_at: p.created_at,
    snippet: snippetForCommunityFeedV1(String(p.body ?? "")),
  }));

  const payload = { items, next_offset: offset + items.length };

  mcaLog.event(
    "community.feed.v1",
    { viewerId: session.userId, count: items.length, offset, limit },
    CTX
  );

  if (isCacheEnabled()) {
    setCache(cacheKey, payload, effectiveTtl(ttlCommunityFeedMs()));
  }

  return successJson(ctx, payload);
}

export const GET = defineRouteSimple("GET /api/community/feed/v1", GET_handler);
