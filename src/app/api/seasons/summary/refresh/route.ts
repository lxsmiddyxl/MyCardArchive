import { SEASON_IDS } from "@/lib/seasons/season-catalog";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { year?: number; season?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const year = Number(body.year);
  const season = String(body.season ?? "").trim().toLowerCase();
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }
  if (!SEASON_IDS.includes(season as (typeof SEASON_IDS)[number])) {
    return NextResponse.json({ error: "Invalid season" }, { status: 400 });
  }

  const { error } = await supabase.rpc("refresh_my_season_summary", {
    p_year: year,
    p_season: season,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/seasons/summary/refresh", POST_handler);
