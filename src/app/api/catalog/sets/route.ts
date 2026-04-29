import { createClient } from "@/lib/supabase/server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

/** GET — list catalog sets (public read via RLS). */
async function GET_handler() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("catalog_sets")
    .select("*")
    .order("release_date", { ascending: false, nullsFirst: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sets: data ?? [] });
}

export const GET = defineRouteNoArgs("GET /api/catalog/sets", GET_handler);
