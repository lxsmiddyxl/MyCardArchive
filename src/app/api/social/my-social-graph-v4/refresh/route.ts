import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/social/my-social-graph-v4/refresh", surfaceName: "social" } as const;

export const dynamic = "force-dynamic";

async function POST_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.rpc("refresh_my_social_graph_v4");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  mcaLog.event("social.graph_v4.refresh", { viewerId: user.id }, CTX);
  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/social/my-social-graph-v4/refresh", POST_handler);
