import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/grading/drift", surfaceName: "grading" } as const;

export const dynamic = "force-dynamic";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: drift, error: dErr } = await supabase.rpc("grading_compute_temporal_drift", {
    p_user_id: user.id,
  });

  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 500 });
  }

  const { data: history, error: hErr } = await supabase
    .from("grading_user_drift_history")
    .select("id, computed_at, slope_per_day, expected_shift_7d, sample_size, calibration_delta")
    .eq("user_id", user.id)
    .order("computed_at", { ascending: false })
    .limit(16);

  if (hErr) {
    return NextResponse.json({ error: hErr.message }, { status: 500 });
  }

  const dj = drift as Record<string, unknown> | null;
  mcaLog.event(
    "grading.model.drift_model",
    {
      viewerId: user.id,
      source: "api",
      sampleSize: dj?.sampleSize,
      expectedShift7d: dj?.expectedShift7d,
    },
    CTX
  );

  return NextResponse.json({ drift, history: history ?? [] });
}

export const GET = defineRouteSimple("GET /api/grading/drift", GET_handler);
