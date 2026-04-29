import { syncCatalogCardsForSet } from "@/lib/catalog/sync";
import { createClient } from "@/lib/supabase/server";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

async function POST_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const setId = context.params["setId"]?.trim();
  if (!setId) {
    return NextResponse.json({ error: "Invalid set id" }, { status: 400 });
  }

  const result = await syncCatalogCardsForSet(setId);
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}

export const POST = defineRoute(
  "POST /api/catalog/sync/cards/[setId]",
  POST_handler
);
