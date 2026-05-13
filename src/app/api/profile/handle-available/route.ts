import { successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { sanitizeHandle } from "@/lib/validation/profile";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const raw = url.searchParams.get("handle") ?? "";
  const handle = sanitizeHandle(raw);
  const excludeUserId = url.searchParams.get("exclude_user_id")?.trim();

  if (!handle || handle.length < 3) {
    return successJson(ctx, { available: false as const, reason: "invalid" as const });
  }

  /* Handles are mirrored to social_public_profiles (RLS: any authenticated user may SELECT).
     public.profiles is owner-scoped — querying it cannot detect another user's taken handle. */
  const { data: taken } = await supabase
    .from("social_public_profiles")
    .select("user_id")
    .eq("handle", handle)
    .maybeSingle();

  if (!taken?.user_id) {
    return successJson(ctx, { available: true as const });
  }
  if (excludeUserId && isUuidString(excludeUserId) && taken.user_id === excludeUserId) {
    return successJson(ctx, { available: true as const });
  }

  return successJson(ctx, { available: false as const, reason: "taken" as const });
}

export const GET = defineRouteSimple("GET /api/profile/handle-available", GET_handler);
