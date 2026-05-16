import { assertProductionEnvParity, getEnvParityReport } from "@/lib/server/env-parity";
import { assertRequiredPublicEnv, hasServiceRoleKey } from "@/lib/server/env-guards";

export type EnvValidationResult = {
  ok: boolean;
  missingRequired: string[];
  warnings: string[];
  hasServiceRole: boolean;
};

/**
 * Production boot validation — public Supabase keys, site URL, optional observability.
 * Safe to call from instrumentation; throws on hard failures in production.
 */
export function validateProductionEnv(opts?: { throwOnMissing?: boolean }): EnvValidationResult {
  const throwOnMissing = opts?.throwOnMissing ?? process.env.NODE_ENV === "production";
  const report = getEnvParityReport();
  const warnings: string[] = [];

  if (!process.env.SENTRY_DSN?.trim()) {
    warnings.push("SENTRY_DSN not set — errors route to structured logs / Vercel Monitoring");
  }
  if (!hasServiceRoleKey()) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY not set — admin/sync routes may be unavailable");
  }

  if (throwOnMissing && report.missingRequired.length > 0) {
    assertRequiredPublicEnv();
    assertProductionEnvParity();
  } else if (report.missingRequired.length === 0) {
    assertRequiredPublicEnv();
  }

  return {
    ok: report.missingRequired.length === 0,
    missingRequired: report.missingRequired,
    warnings,
    hasServiceRole: hasServiceRoleKey(),
  };
}
