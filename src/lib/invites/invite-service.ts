import "server-only";

import {
  generateInviteCode,
  inviteCodesToCsv,
  normalizeInviteCode,
} from "@/lib/invites/invite-config";
export { inviteCodesToCsv };
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

export async function createInviteCodesBulk(
  createdBy: string,
  count: number
): Promise<InviteRow[]> {
  const admin = createServiceRoleClient();
  if (!admin || count < 1 || count > 100) return [];
  const rows: InviteRow[] = [];
  for (let i = 0; i < count; i++) {
    const row = await createInviteCode(createdBy);
    if (row) rows.push(row);
  }
  return rows;
}

export type InviteUsageStats = {
  total: number;
  used: number;
  unused: number;
  recent: { code: string; used_at: string | null; created_at: string }[];
};

export async function getInviteUsageStats(createdBy: string): Promise<InviteUsageStats> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return { total: 0, used: 0, unused: 0, recent: [] };
  }
  const { data } = await admin
    .from("invite_codes")
    .select("code, used_at, created_at, used_by")
    .eq("created_by", createdBy)
    .order("created_at", { ascending: false })
    .limit(200);

  const list = data ?? [];
  const used = list.filter((r) => r.used_by).length;
  return {
    total: list.length,
    used,
    unused: list.length - used,
    recent: list.map((r) => ({
      code: r.code,
      used_at: r.used_at,
      created_at: r.created_at,
    })),
  };
}

