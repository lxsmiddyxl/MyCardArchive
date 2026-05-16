import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

const MAX_URL = 2048;

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { banner_url?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const bannerUrl = body.banner_url?.trim() || null;
  if (bannerUrl && bannerUrl.length > MAX_URL) {
    return errorJson(ctx, "banner_url too long", 400, { code: ApiErrorCode.BAD_REQUEST });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ profile_banner_url: bannerUrl })
    .eq("id", session.userId);

  if (error) {
    return errorJson(ctx, error.message, 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }

  return successJson(ctx, { profile_banner_url: bannerUrl });
}

export const POST = defineRouteSimple("POST /api/users/profile/banner", POST_handler);
