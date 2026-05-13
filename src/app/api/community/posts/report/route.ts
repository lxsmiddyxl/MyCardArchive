import { errorJson, successJson, validateSession, withContextId } from "@/lib/api/route-helpers";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteSimple } from "@/lib/server/api-route";
import { isUuidString } from "@/lib/server/is-uuid";
import { createClient } from "@/lib/supabase/route";

const CTX = { componentName: "api/community/posts/report", surfaceName: "community.moderation" } as const;

export const dynamic = "force-dynamic";

type ReportBody = {
  post_id?: string;
  reason_code?: string;
};

/** Report a community post for review (Phase 69) — audit trail via structured logs. */
async function POST_handler(request: Request) {
  const ctx = withContextId();
  const supabase = createClient();
  const session = await validateSession(supabase, ctx);
  if (!session.ok) return session.response;

  let body: ReportBody;
  try {
    body = (await request.json()) as ReportBody;
  } catch {
    return errorJson(ctx, "Invalid JSON", 400);
  }

  const postId = typeof body.post_id === "string" ? body.post_id.trim() : "";
  const reason = typeof body.reason_code === "string" ? body.reason_code.trim().slice(0, 64) : "unspecified";
  if (!postId || !isUuidString(postId)) {
    return errorJson(ctx, "post_id required", 400);
  }

  mcaLog.event(
    "community.post.report",
    { reporterId: session.userId, postId, reason_code: reason || "unspecified" },
    CTX
  );

  return successJson(ctx, { received: true });
}

export const POST = defineRouteSimple("POST /api/community/posts/report", POST_handler);
