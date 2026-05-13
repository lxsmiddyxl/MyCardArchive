import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { ApiErrorCode } from "@/lib/api/api-error-codes";
import { loadProfileV3EcosystemStats } from "@/lib/profile/profile-v3-stats";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const res = await loadProfileV3EcosystemStats(supabase, session.userId);
  if (!res.ok) {
    return errorJson(ctx, safePublicDbMessage(res.message), 500, { code: ApiErrorCode.SUPABASE_QUERY });
  }
  return successJson(ctx, { stats: res.stats });
}

export const GET = defineRouteSimple("GET /api/profile/me/v3-stats", GET_handler);
