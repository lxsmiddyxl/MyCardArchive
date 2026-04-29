import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/mobile/push/register", surfaceName: "mobile" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { subscription?: { endpoint?: string } } | null;
  let endpointHost: string | null = null;
  try {
    const ep = body?.subscription?.endpoint;
    if (ep) endpointHost = new URL(ep).host;
  } catch {
    endpointHost = null;
  }

  mcaLog.event("mobile.push.register", { viewerId: user.id, endpointHost }, CTX);

  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/mobile/push/register", POST_handler);
