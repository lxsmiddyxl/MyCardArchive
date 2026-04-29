import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/market/engine", surfaceName: "marketplace" } as const;

export const dynamic = "force-dynamic";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: graph, error: gErr } = await supabase.rpc("compute_trade_graph_for_user", {
    p_user_id: user.id,
  });

  if (gErr) {
    return NextResponse.json({ error: gErr.message }, { status: 500 });
  }

  const { data: loops, error: lErr } = await supabase.rpc("compute_multi_party_loops", {
    p_user_id: user.id,
    p_limit: 32,
  });

  if (lErr) {
    return NextResponse.json({ error: lErr.message }, { status: 500 });
  }

  const g = graph as Record<string, unknown> | null;
  const paths = Array.isArray(g?.best_trade_paths) ? g.best_trade_paths : [];
  const l = loops as Record<string, unknown> | null;
  const l3 = Array.isArray(l?.loops_3) ? l.loops_3 : [];
  const l4 = Array.isArray(l?.loops_4) ? l.loops_4 : [];

  mcaLog.event(
    "market.engine.compute",
    {
      viewerId: user.id,
      edgeCountOut: g?.edge_count_out,
      edgeCountIn: g?.edge_count_in,
      bestPathCount: paths.length,
    },
    CTX
  );

  if (l3.length + l4.length > 0) {
    mcaLog.event(
      "market.engine.loop_detected",
      {
        viewerId: user.id,
        loops3: l3.length,
        loops4: l4.length,
      },
      CTX
    );
  }

  return NextResponse.json({
    graph: graph ?? {},
    loops: loops ?? { loops_3: [], loops_4: [] },
  });
}

export const GET = defineRouteSimple("GET /api/market/engine", GET_handler);
