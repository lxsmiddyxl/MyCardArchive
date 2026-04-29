import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const LIMIT = 8;

async function GET_handler(_request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("social_public_activity")
    .select("id, action, trade_id, metadata, created_at, source_activity_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ activity: data ?? [] });
}

export const GET = defineRouteSimple("GET /api/social/recent-activity", GET_handler);
