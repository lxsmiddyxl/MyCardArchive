import { syncCatalogSets } from "@/lib/catalog/sync";
import { createClient } from "@/lib/supabase/server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

/**
 * POST — upsert catalog sets (service role). Requires signed-in user.
 */
async function POST_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncCatalogSets();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}

export const POST = defineRouteNoArgs("POST /api/catalog/sync/sets", POST_handler);
