import { platformHeadlineFromBand } from "@/lib/activity-waves/band-labels";
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

async function GET_handler() {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  await ensureActivityWavesFresh(supabase);
  const { data: cells, error } = await supabase.rpc("get_platform_activity_wave");
  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500);
  }
  const { data: sl } = await supabase.rpc("get_activity_spotlights", { p_limit: 4 });
  const spotlights = (Array.isArray(sl) ? sl : [])
    .map((r) => (r as { note?: string }).note)
    .filter((x): x is string => Boolean(x?.trim()));

  const now = new Date();
  const d = now.getUTCDay();
  const isoDow = d === 0 ? 7 : d;
  const hour = now.getUTCHours();
  const g = Array.isArray(cells) ? cells : [];
  const cell = g.find(
    (r) =>
      (r as { day_bucket: number }).day_bucket === isoDow &&
      (r as { hour_bucket: number }).hour_bucket === hour
  ) as { wave_band?: string } | undefined;
  const headline = platformHeadlineFromBand(cell?.wave_band);

  return successJson(ctx, {
    cells: g,
    spotlights,
    headline,
  });
}

export const GET = defineRouteSimple("GET /api/activity-waves/platform", GET_handler);
