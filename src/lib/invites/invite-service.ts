import "server-only";

import { generateInviteCode, normalizeInviteCode } from "@/lib/invites/invite-config";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";

export type InviteRow = Database["public"]["Tables"]["invite_codes"]["Row"];

export async function findInviteByCode(code: string): Promise<InviteRow | null> {
  const admin = createServiceRoleClient();
  if (!admin) return null;
  const normalized = normalizeInviteCode(code);
  const { data, error } = await admin
    .from("invite_codes")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

export async function createInviteCode(createdBy: string): Promise<InviteRow | null> {
  const admin = createServiceRoleClient();
  if (!admin) return null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const { data, error } = await admin
      .from("invite_codes")
      .insert({ code, created_by: createdBy })
      .select("*")
      .single();
    if (!error && data) return data;
    if (error && !String(error.message).includes("duplicate")) return null;
  }
  return null;
}

export async function markInviteUsed(code: string, userId: string): Promise<boolean> {
  const admin = createServiceRoleClient();
  if (!admin) return false;
  const normalized = normalizeInviteCode(code);
  const { error } = await admin
    .from("invite_codes")
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq("code", normalized)
    .is("used_by", null);
  return !error;
}

export async function getInviteStatus(code: string): Promise<{
  valid: boolean;
  used: boolean;
  reason?: string;
}> {
  const row = await findInviteByCode(code);
  if (!row) return { valid: false, used: false, reason: "not_found" };
  if (row.used_by) return { valid: false, used: true, reason: "already_used" };
  return { valid: true, used: false };
}
