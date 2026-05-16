import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedProfile = {
  id: string;
  display_name: string | null;
  handle: string | null;
  username: string | null;
  avatar_url: string | null;
};

export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export async function resolveProfileByHandle(
  supabase: SupabaseClient<Database>,
  rawHandle: string
): Promise<ResolvedProfile | null> {
  const handle = normalizeHandle(rawHandle);
  if (!handle) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, handle, username, avatar_url")
    .ilike("handle", handle)
    .maybeSingle();

  return data ?? null;
}
