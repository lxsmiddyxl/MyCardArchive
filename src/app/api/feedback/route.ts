import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CTX = { componentName: "api", surfaceName: "feedback" } as const;

async function POST_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const message = typeof o.message === "string" ? o.message.trim() : "";
  if (!message || message.length > 8000) {
    return NextResponse.json({ error: "message required (max 8000 chars)" }, { status: 400 });
  }

  const feature = typeof o.feature === "string" ? o.feature.slice(0, 120) : undefined;
  const rating = typeof o.rating === "number" && Number.isFinite(o.rating) ? o.rating : undefined;

  mcaLog.event(
    "feedback.submit",
    {
      userId: user.id,
      len: message.length,
      feature,
      rating,
    },
    CTX
  );

  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/feedback", POST_handler);
