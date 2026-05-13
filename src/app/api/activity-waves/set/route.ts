import { waveBandToDisplayLabel } from "@/lib/activity-waves/band-labels";
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

  const setId = new URL(request.url).searchParams.get("setId")?.trim();
  if (!setId) {
    return errorJson(ctx, "setId required", 400);
  }

  await ensureActivityWavesFresh(supabase);
  const { data: rows, error } = await supabase.rpc("get_set_activity_wave", { p_set_id: setId });
  if (error) {
    return errorJson(ctx, safePublicDbMessage(error.message), 500);
  }

  const list = Array.isArray(rows) ? rows : [];
  const hour = new Date().getUTCHours();
  const cur = list.find((r) => (r as { hour_bucket: number }).hour_bucket === hour) as
    | { wave_band?: string }
    | undefined;
  const headline = cur?.wave_band ? `${waveBandToDisplayLabel(cur.wave_band)} · This set` : null;

  return successJson(ctx, { hours: list, headline });
}

export const GET = defineRouteSimple("GET /api/activity-waves/set", GET_handler);
