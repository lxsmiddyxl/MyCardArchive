import { errorJson, MCA_CONTEXT_HEADER, withContextId } from "@/lib/api/route-helpers";
import { MCA_INVITE_COOKIE, normalizeInviteCode } from "@/lib/invites/invite-config";
import { getInviteStatus } from "@/lib/invites/invite-service";
import { defineRouteSimple } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

type RedeemBody = { code?: string };

async function POST_handler(request: Request) {
  const ctx = withContextId();
  let body: RedeemBody;
  try {
    body = (await request.json()) as RedeemBody;
  } catch {
    return errorJson(ctx, "Invalid request body.", 400);
  }

  const code = normalizeInviteCode(body.code ?? "");
  if (!code) {
    return errorJson(ctx, "Invite code is required.", 400);
  }

  const status = await getInviteStatus(code);
  if (!status.valid) {
    const msg =
      status.reason === "already_used"
        ? "This invite code has already been used."
        : "Invalid invite code.";
    return errorJson(ctx, msg, 400, { reason: status.reason });
  }

  const res = NextResponse.json(
    { ok: true, context_id: ctx.contextId, data: { code } },
    { status: 200 }
  );
  res.headers.set(MCA_CONTEXT_HEADER, ctx.contextId);
  res.cookies.set(MCA_INVITE_COOKIE, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 4,
  });
  return res;
}

export const POST = defineRouteSimple("POST /api/invites/redeem", POST_handler);
