import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
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

  const { data, error } = await supabase
    .from("market_alert_prefs")
    .select("alert_ft_available, alert_trade_overlap, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    prefs: data ?? {
      alert_ft_available: true,
      alert_trade_overlap: true,
      updated_at: null,
    },
  });
}

async function PATCH_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    alert_ft_available?: boolean;
    alert_trade_overlap?: boolean;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, boolean> = {};
  if (typeof body.alert_ft_available === "boolean") {
    patch.alert_ft_available = body.alert_ft_available;
  }
  if (typeof body.alert_trade_overlap === "boolean") {
    patch.alert_trade_overlap = body.alert_trade_overlap;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("market_alert_prefs")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("market_alert_prefs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("alert_ft_available, alert_trade_overlap, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ prefs: data });
  }

  const { data, error } = await supabase
    .from("market_alert_prefs")
    .insert({
      user_id: user.id,
      alert_ft_available: patch.alert_ft_available ?? true,
      alert_trade_overlap: patch.alert_trade_overlap ?? true,
    })
    .select("alert_ft_available, alert_trade_overlap, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prefs: data });
}

export const GET = defineRouteSimple("GET /api/market/alert-prefs", GET_handler);
export const PATCH = defineRouteSimple("PATCH /api/market/alert-prefs", PATCH_handler);
