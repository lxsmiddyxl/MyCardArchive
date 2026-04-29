import { getCollectionAnalytics } from "@/lib/analytics/get-collection-analytics";
import { createClient } from "@/lib/supabase/server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const analytics = await getCollectionAnalytics(supabase);
  return NextResponse.json(analytics);
}

export const GET = defineRouteNoArgs("GET /api/analytics/collection", GET_handler);
