import "server-only";

import type { Database } from "@/lib/supabase/types";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service role key (bypasses RLS).
 * Returns null when `SUPABASE_SERVICE_ROLE_KEY` is not configured.
 */
export function createServiceRoleClient(): ReturnType<
  typeof createClient<Database>
> | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) {
      return null;
    }
    return createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      db: { schema: "public" },
    });
  } catch {
    return null;
  }
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()?.length);
}
