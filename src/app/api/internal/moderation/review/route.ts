import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/internal/moderation/review", surfaceName: "community.moderation" } as const;

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = request.headers.get("x-internal-telemetry-secret");
  return (
    typeof process.env.INTERNAL_TELEMETRY_SECRET === "string" &&
    process.env.INTERNAL_TELEMETRY_SECRET.length > 0 &&
    secret === process.env.INTERNAL_TELEMETRY_SECRET
  );
}

/** Admin-only moderation audit hook (Phase 69) — logs structured actions; no direct DB writes. */
async function POST_handler(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { post_id?: string; action?: string };
  try {
    body = (await request.json()) as { post_id?: string; action?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const postId = typeof body.post_id === "string" ? body.post_id.trim() : "";
  const action = typeof body.action === "string" ? body.action.trim().slice(0, 64) : "unknown";
  if (!postId || !isUuidString(postId)) {
    return NextResponse.json({ error: "post_id required" }, { status: 400 });
  }

  mcaLog.event("community.moderation.review", { postId, action }, CTX);
  return NextResponse.json({ ok: true });
}

export const POST = defineRouteSimple("POST /api/internal/moderation/review", POST_handler);
