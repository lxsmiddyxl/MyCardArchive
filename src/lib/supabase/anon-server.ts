import "server-only";

import type { Database } from "@/lib/supabase/types";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const anonOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: "public" as const },
};

/** Server-only anon client (no cookies). Safe for public routes, OG images, and edge. */
export function createAnonServerClient(): SupabaseClient<Database> {
  const { url, anonKey } = getSupabasePublicEnv();
  return createClient<Database>(url, anonKey, anonOptions);
}

/**
 * Same as createAnonServerClient, but returns null when env is missing so SSR/public
 * routes can degrade to 404 instead of throwing.
 */
export function tryCreateAnonServerClient(): SupabaseClient<Database> | null {
  try {
    return createAnonServerClient();
  } catch {
    return null;
  }
}
