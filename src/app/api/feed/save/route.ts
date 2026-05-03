import { errorJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

const CTX = { componentName: "api/feed/save", surfaceName: "feed" } as const;

export const dynamic = "force-dynamic";

async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: { feedEventId?: string } = {};
  try {
    body = (await request.json()) as { feedEventId?: string };
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const feedEventId = typeof body.feedEventId === "string" ? body.feedEventId.trim() : "";
  if (!feedEventId || !isUuidString(feedEventId)) {
    return errorJson(ctx, "Invalid feed event id", 400);
  }

  const { error } = await supabase.from("feed_event_saves").upsert(
    { user_id: session.userId, feed_event_id: feedEventId },
    { onConflict: "user_id,feed_event_id" }
  );
  if (error) {
    return errorJson(ctx, error.message, 500);
  }
  mcaLog.event("feed.save", { feedEventId, active: true }, CTX);
  return NextResponse.json({ success: true, context_id: ctx.contextId, ok: true });
}

async function DELETE_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  const url = new URL(request.url);
  const feedEventId = url.searchParams.get("feedEventId")?.trim() ?? "";
  if (!feedEventId || !isUuidString(feedEventId)) {
    return errorJson(ctx, "Invalid feed event id", 400);
  }

  const { error } = await supabase
    .from("feed_event_saves")
    .delete()
    .eq("user_id", session.userId)
    .eq("feed_event_id", feedEventId);
  if (error) {
    return errorJson(ctx, error.message, 500);
  }
  mcaLog.event("feed.save", { feedEventId, active: false }, CTX);
  return NextResponse.json({ success: true, context_id: ctx.contextId, ok: true });
}

export const POST = defineRouteSimple("POST /api/feed/save", POST_handler);
export const DELETE = defineRouteSimple("DELETE /api/feed/save", DELETE_handler);
