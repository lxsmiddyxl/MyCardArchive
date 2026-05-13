import { waveBandToPulseHeadline } from "@/lib/activity-waves/band-labels";
import { ensureActivityWavesFresh } from "@/lib/activity-waves/ensure-activity-waves-fresh";
import {
  errorJson,
  safePublicDbMessage,
  successJson,
  validateSession,
  withContextId,
} from "@/lib/api/route-helpers";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";

export const dynamic = "force-dynamic";

async function GET_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const seasonId = new URL(request.url).searchParams.get("seasonId")?.trim();
  if (!seasonId) {
    return errorJson(ctx, "seasonId required", 400);
  }

  await ensureActivityWavesFresh(supabase);
  const { data: rows, error } = await supabase.rpc("get_seasonal_activity_wave", {
    p_season_id: seasonId,
  });
  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500);
  }

  const list = Array.isArray(rows) ? rows : [];
  const hour = new Date().getUTCHours();
  const cur = list.find((r) => (r as { hour_bucket: number }).hour_bucket === hour) as
    | { wave_band?: string }
    | undefined;
  const pulseHeadline = waveBandToPulseHeadline(cur?.wave_band);

  return successJson(ctx, { hours: list, pulseHeadline });
}

export const GET = defineRouteSimple("GET /api/activity-waves/season", GET_handler);
