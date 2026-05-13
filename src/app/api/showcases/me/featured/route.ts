import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { mapShowcaseRowToPublicV1 } from "@/lib/showcases/map-showcase-public";
import { isShowcaseFeaturedFromDescription } from "@/lib/showcases/showcase-featured-meta";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data: rows, error } = await supabase
    .from("collection_showcases")
    .select("*")
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }
  const list = rows ?? [];
  const featured = list.find((r) => isShowcaseFeaturedFromDescription(r.description));
  const fallback = list[0];
  const row = featured ?? fallback;
  if (!row) {
    return successJson(ctx, { showcase: null });
  }
  return successJson(ctx, { showcase: mapShowcaseRowToPublicV1(row) });
}

export const GET = defineRouteSimple("GET /api/showcases/me/featured", GET_handler);
