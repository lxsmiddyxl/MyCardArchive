import "server-only";

/**
 * Logical region ids (e.g. `us-east-1`, `eu-west-1`). Not AWS ARNs — labels for routing + health.
 * Pair with region-specific Supabase/site URLs when operating multi-region.
 */
export function getPrimaryRegion(): string {
  return process.env.PRIMARY_REGION?.trim() || "primary";
}

export function getSecondaryRegion(): string {
  return process.env.SECONDARY_REGION?.trim() || "";
}

export function isRegionFailoverEnabled(): boolean {
  return process.env.REGION_FAILOVER_ENABLED === "1";
}

/** Env override; in-memory override via region-state takes precedence at runtime when set. */
export function getConfiguredActiveRegion(): string {
  return process.env.ACTIVE_REGION?.trim() || getPrimaryRegion();
}

/**
 * Supabase project URL for a logical region.
 * Primary defaults to `NEXT_PUBLIC_SUPABASE_URL`; secondary uses `NEXT_PUBLIC_SUPABASE_URL_SECONDARY` when set.
 */
export function getSupabaseUrlForRegion(region: string): string | null {
  const primary = getPrimaryRegion();
  const secondary = getSecondaryRegion();
  const primaryUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const secondaryUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_SECONDARY?.trim();
  if (region === primary) return primaryUrl || null;
  if (secondary && region === secondary) return secondaryUrl || primaryUrl || null;
  return null;
}

export function getAnonKeyForRegion(region: string): string | null {
  const primary = getPrimaryRegion();
  const secondary = getSecondaryRegion();
  const primaryKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const secondaryKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECONDARY?.trim();
  if (region === primary) return primaryKey || null;
  if (secondary && region === secondary) return secondaryKey || primaryKey || null;
  return null;
}

/**
 * Public site origin for health probes (telemetry path). Secondary may share primary URL until split.
 */
export function getSiteUrlForRegion(region: string): string {
  const primary = getPrimaryRegion();
  const secondary = getSecondaryRegion();
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "http://127.0.0.1:3000";
  const secondarySite = process.env.NEXT_PUBLIC_SITE_URL_SECONDARY?.trim().replace(/\/$/, "");
  if (region === primary) return base;
  if (secondary && region === secondary) return secondarySite || base;
  return base;
}
