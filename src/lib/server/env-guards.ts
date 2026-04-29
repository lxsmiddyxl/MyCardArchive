import { getSupabasePublicEnv } from "@/lib/supabase/env";

let validated = false;

/**
 * Validates required public Supabase env. Safe to call multiple times.
 * Optional server-only vars are checked separately per feature.
 */
export function assertRequiredPublicEnv(): void {
  if (validated) return;
  getSupabasePublicEnv();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!site) {
    throw new Error(
      "Missing NEXT_PUBLIC_SITE_URL (used for absolute URLs, OG metadata, and redirects)"
    );
  }
  validated = true;
}

/**
 * Returns true if service role key is present (admin/sync routes).
 */
export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()?.length);
}
