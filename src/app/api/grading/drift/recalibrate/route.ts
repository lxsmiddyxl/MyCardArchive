import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/grading/drift/recalibrate", surfaceName: "grading" } as const;

export const dynamic = "force-dynamic";

async function POST_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("grading_recalibrate_for_drift", {
    p_user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const body = data as { adjustedBy?: number; drift?: unknown; error?: string } | null;
  if (body?.error) {
    return NextResponse.json({ error: body.error }, { status: 403 });
  }

  mcaLog.event(
    "grading.model.recalibrate",
    {
      viewerId: user.id,
      adjustedBy: body?.adjustedBy ?? null,
    },
    CTX
  );

  return NextResponse.json({ result: data });
}

export const POST = defineRouteSimple("POST /api/grading/drift/recalibrate", POST_handler);
