import { ApiErrorCode } from "@/lib/api/api-error-codes";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { applyExclusiveFeaturedShowcase } from "@/lib/showcases/apply-featured-showcase";
import { mapShowcaseRowToPublicV1 } from "@/lib/showcases/map-showcase-public";
import { withShowcaseFeaturedDescription } from "@/lib/showcases/showcase-featured-meta";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const { data, error } = await supabase
    .from("collection_showcases")
    .select("*")
    .eq("user_id", session.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }
  const showcases = (data ?? []).map((row) => mapShowcaseRowToPublicV1(row));
  return successJson(ctx, { showcases });
}

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const body = (await request.json().catch(() => null)) as {
    title?: string;
    description?: string | null;
    binder_ids?: string[];
    featured_card_ids?: string[];
    is_featured?: boolean;
  } | null;

  if (!body || typeof body.title !== "string" || body.title.trim().length === 0) {
    return errorJson(ctx, "title required", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const binder_ids = Array.isArray(body.binder_ids) ? body.binder_ids : [];
  const featured_card_ids = Array.isArray(body.featured_card_ids) ? body.featured_card_ids : [];
  const baseDescription =
    typeof body.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : null;
  const wantsFeatured = body.is_featured === true;
  const description = withShowcaseFeaturedDescription(baseDescription, wantsFeatured);

  const { data, error } = await supabase
    .from("collection_showcases")
    .insert({
      user_id: session.userId,
      title: body.title.trim(),
      description,
      binder_ids,
      featured_card_ids,
    })
    .select("*")
    .single();

  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 400, {
      code: ApiErrorCode.SUPABASE_QUERY,
    });
  }

  if (wantsFeatured) {
    const applied = await applyExclusiveFeaturedShowcase(supabase, session.userId, data.id);
    if (!applied.ok) {
      return errorJson(ctx, applied.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
    }
    const { data: refreshed } = await supabase.from("collection_showcases").select("*").eq("id", data.id).single();
    return successJson(ctx, { showcase: mapShowcaseRowToPublicV1(refreshed ?? data) });
  }

  return successJson(ctx, { showcase: mapShowcaseRowToPublicV1(data) });
}

export const GET = defineRouteSimple("GET /api/showcases", GET_handler);
export const POST = defineRouteSimple("POST /api/showcases", POST_handler);
