import { successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { loadOnboardingFlags } from "@/mca-utils/onboarding/checkOnboarding";
import { createClient } from "@/lib/supabase/server";

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const flags = await loadOnboardingFlags(supabase, session.userId);
  return successJson(ctx, {
    onboarding_complete: flags?.onboarding_complete ?? false,
    scan_tutorial_seen: flags?.scan_tutorial_seen ?? false,
  });
}

export const GET = defineRouteNoArgs("GET /api/onboarding/status", GET_handler);
