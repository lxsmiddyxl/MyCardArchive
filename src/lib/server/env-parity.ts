/**
 * Environment parity helpers: same expectations for local, staging, and production.
 * Does not read secrets — only names and presence of public markers.
 */

const REQUIRED_PUBLIC = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

/** Recommended for consistent URLs, OAuth redirects, and metadata (may be absent in throwaway sandboxes). */
const RECOMMENDED_PUBLIC = [
  "NEXT_PUBLIC_MCA_DEV_UI",
  "NEXT_PUBLIC_STABILITY_MODE",
] as const;

export type EnvParityReport = {
  missingRequired: string[];
  missingRecommended: string[];
  nodeEnv: string | undefined;
};

function isNonEmpty(name: string): boolean {
  return Boolean(process.env[name]?.trim()?.length);
}

export function getEnvParityReport(): EnvParityReport {
  const missingRequired = REQUIRED_PUBLIC.filter((n) => !isNonEmpty(n));
  const missingRecommended = RECOMMENDED_PUBLIC.filter((n) => !isNonEmpty(n));
  return {
    missingRequired,
    missingRecommended,
    nodeEnv: process.env.NODE_ENV,
  };
}

export function assertProductionEnvParity(): void {
  if (process.env.NODE_ENV !== "production") return;
  const r = getEnvParityReport();
  if (r.missingRequired.length > 0) {
    throw new Error(
      `Missing required public env in production: ${r.missingRequired.join(", ")}`
    );
  }
}
