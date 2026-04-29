import { ensurePublicProfile } from "@/lib/supabase/ensurePublicProfile";
import type { Database } from "@/lib/supabase/types";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Ensures `public.profiles` has a row for the authenticated user (OAuth, email, magic link, etc.).
 * Idempotent; safe on every request.
 */
export async function ensureProfile(
  supabase: SupabaseClient<Database>,
  user: Pick<User, "id" | "email">
): Promise<ProfileRow> {
  const { data: existing, error: selectErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (selectErr) throw selectErr;
  if (existing) return existing;

  const now = new Date().toISOString();

  const { data: inserted, error: insertErr } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? null,
      created_at: now,
      joined_at: now,
    })
    .select("*")
    .maybeSingle();

  if (!insertErr && inserted) {
    return inserted;
  }

  // Race: concurrent request inserted first, or conflict
  const { data: retry, error: retryErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (retryErr) throw retryErr;
  if (retry) return retry;

  throw insertErr ?? new Error("ensureProfile: insert failed without row");
}

/** Runs {@link ensureProfile} then {@link ensurePublicProfile} — use on login / layout / middleware. */
export async function ensureProfileAndPublic(
  supabase: SupabaseClient<Database>,
  user: Pick<User, "id" | "email">
): Promise<ProfileRow> {
  const profile = await ensureProfile(supabase, user);
  await ensurePublicProfile(supabase, user.id);
  return profile;
}
