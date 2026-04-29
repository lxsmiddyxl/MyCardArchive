import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../supabase/types/database.types";

type ServiceClient = SupabaseClient<Database>;

/**
 * Idempotent: grant bonus scans from a completed scan-pack Checkout session.
 * Returns whether a new grant was applied (false if session was already processed).
 */
export async function grantScanPackFromCheckoutSession(
  service: ServiceClient,
  params: {
    checkoutSessionId: string;
    userId: string;
    packId: string;
    bonusScans: number;
  }
): Promise<boolean> {
  const { checkoutSessionId, userId, packId, bonusScans } = params;
  if (!checkoutSessionId || !userId || bonusScans <= 0) {
    return false;
  }

  const { error: insertErr } = await service.from("stripe_scan_pack_grants").insert({
    checkout_session_id: checkoutSessionId,
    user_id: userId,
    bonus_scans: bonusScans,
    pack_id: packId,
  });

  if (insertErr) {
    const msg = insertErr.message?.toLowerCase() ?? "";
    if (
      msg.includes("duplicate") ||
      msg.includes("unique") ||
      insertErr.code === "23505"
    ) {
      return false;
    }
    throw insertErr;
  }

  const { error: rpcErr } = await service.rpc("increment_bonus_scans_remaining", {
    p_user_id: userId,
    p_delta: bonusScans,
  });

  if (rpcErr) {
    throw rpcErr;
  }

  return true;
}
