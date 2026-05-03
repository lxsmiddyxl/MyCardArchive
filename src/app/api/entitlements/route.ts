import { resolveEntitlements } from "@/lib/entitlements/resolve-entitlements";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolved = await resolveEntitlements(supabase);
  if (!resolved) {
    return NextResponse.json({ error: "No tier row" }, { status: 404 });
  }

  return NextResponse.json(resolved);
}

export const GET = defineRouteNoArgs("GET /api/entitlements", GET_handler);
