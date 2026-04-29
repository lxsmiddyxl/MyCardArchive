import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ensures `social_public_profiles` has a row via SECURITY DEFINER RPC (mirrors profiles).
 * Idempotent.
 */
export async function ensurePublicProfile(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { data: row, error: selErr } = await supabase
    .from("social_public_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (selErr) throw selErr;
  if (row) return;

  const { error: rpcErr } = await supabase.rpc("ensure_social_public_profile_projection", {
    p_user_id: userId,
  });

  if (rpcErr) throw rpcErr;
}
