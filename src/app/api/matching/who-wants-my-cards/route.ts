import { getUsersWhoWantMyCards } from "@/lib/matching/db";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { withMatchingTelemetry } from "@/lib/telemetry/matching-instrumentation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const matches = await withMatchingTelemetry("who-wants-my-cards", user.id, () =>
    getUsersWhoWantMyCards(supabase, user.id)
  );

  return NextResponse.json({ matches });
}

export const GET = defineRouteSimple("GET /api/matching/who-wants-my-cards", GET_handler);
