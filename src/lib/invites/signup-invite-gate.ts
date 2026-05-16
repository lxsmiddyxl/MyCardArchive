import "server-only";

import {
  isAdminEmail,
  isInviteGateEnabled,
  MCA_INVITE_COOKIE,
  normalizeInviteCode,
} from "@/lib/invites/invite-config";
import { getInviteStatus, markInviteUsed } from "@/lib/invites/invite-service";
import { cookies } from "next/headers";

export async function assertSignupInviteAllowed(opts: {
  email: string;
  inviteCodeFromBody?: string;
}): Promise<{ ok: true; code: string } | { ok: false; reason: string; message: string }> {
  if (!isInviteGateEnabled()) {
    return { ok: true, code: "" };
  }

  if (isAdminEmail(opts.email)) {
    return { ok: true, code: "" };
  }

  const jar = await cookies();
  const fromCookie = jar.get(MCA_INVITE_COOKIE)?.value ?? "";
  const code = normalizeInviteCode(opts.inviteCodeFromBody || fromCookie);
  if (!code) {
    return {
      ok: false,
      reason: "invite_required",
      message: "An invite code is required to create an account.",
    };
  }

  const status = await getInviteStatus(code);
  if (!status.valid) {
    return {
      ok: false,
      reason: status.reason ?? "invalid_invite",
      message:
        status.reason === "already_used"
          ? "This invite code has already been used."
          : "Invalid invite code.",
    };
  }

  return { ok: true, code };
}

export async function consumeSignupInvite(code: string, userId: string): Promise<void> {
  if (!code) return;
  await markInviteUsed(code, userId);
}
