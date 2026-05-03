import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type Db = SupabaseClient<Database>;

/**
 * True when the signed-in user has an internal unlimited row (RLS: own row only).
 * Never reveals whether another user is internal — cross-user queries return empty.
 */
export async function isCurrentUserInternalUnlimited(client: Db): Promise<boolean> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return false;

  const { data, error } = await client
    .from("internal_unlimited")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}
