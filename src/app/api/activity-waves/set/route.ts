import { ensureActivityWavesFresh } from "@/lib/activity-waves/ensure-activity-waves-fresh";
import { waveBandToDisplayLabel } from "@/lib/activity-waves/band-labels";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setId = new URL(request.url).searchParams.get("setId")?.trim();
  if (!setId) {
    return NextResponse.json({ error: "setId required" }, { status: 400 });
  }

  await ensureActivityWavesFresh(supabase);
  const { data: rows, error } = await supabase.rpc("get_set_activity_wave", { p_set_id: setId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = Array.isArray(rows) ? rows : [];
  const hour = new Date().getUTCHours();
  const cur = list.find((r) => (r as { hour_bucket: number }).hour_bucket === hour) as
    | { wave_band?: string }
    | undefined;
  const headline = cur?.wave_band ? `${waveBandToDisplayLabel(cur.wave_band)} · This set` : null;

  return NextResponse.json({ hours: list, headline });
}

export const GET = defineRouteSimple("GET /api/activity-waves/set", GET_handler);
