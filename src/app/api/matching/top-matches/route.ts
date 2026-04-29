import { getTopMatchesForUser } from "@/lib/matching/db";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { withMatchingTelemetry } from "@/lib/telemetry/matching-instrumentation";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseLimit(raw: string | null): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(100, Math.max(1, n));
}

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = parseLimit(new URL(request.url).searchParams.get("limit"));
  const matches = await withMatchingTelemetry("top-matches", user.id, () =>
    getTopMatchesForUser(supabase, user.id, limit)
  );

  return NextResponse.json({ matches });
}

export const GET = defineRouteSimple("GET /api/matching/top-matches", GET_handler);
