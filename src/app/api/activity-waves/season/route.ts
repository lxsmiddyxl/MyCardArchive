import { waveBandToPulseHeadline } from "@/lib/activity-waves/band-labels";
import { ensureActivityWavesFresh } from "@/lib/activity-waves/ensure-activity-waves-fresh";
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

  const seasonId = new URL(request.url).searchParams.get("seasonId")?.trim();
  if (!seasonId) {
    return NextResponse.json({ error: "seasonId required" }, { status: 400 });
  }

  await ensureActivityWavesFresh(supabase);
  const { data: rows, error } = await supabase.rpc("get_seasonal_activity_wave", {
    p_season_id: seasonId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const list = Array.isArray(rows) ? rows : [];
  const hour = new Date().getUTCHours();
  const cur = list.find((r) => (r as { hour_bucket: number }).hour_bucket === hour) as
    | { wave_band?: string }
    | undefined;
  const pulseHeadline = waveBandToPulseHeadline(cur?.wave_band);

  return NextResponse.json({ hours: list, pulseHeadline });
}

export const GET = defineRouteSimple("GET /api/activity-waves/season", GET_handler);
