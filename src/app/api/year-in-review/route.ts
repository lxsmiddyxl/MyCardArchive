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

  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const subject = (url.searchParams.get("userId") ?? user.id).trim();

  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("get_user_year_in_review", {
    p_user_id: subject,
    p_year: year,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const row = Array.isArray(data) && data.length > 0 ? (data[0] as Record<string, unknown>) : null;
  return NextResponse.json({
    summary: row?.summary_json ?? null,
    generatedAt: row?.generated_at ?? null,
    viewedAt: row?.viewed_at ?? null,
    viewerIsSubject: subject === user.id,
  });
}

export const GET = defineRouteSimple("GET /api/year-in-review", GET_handler);
