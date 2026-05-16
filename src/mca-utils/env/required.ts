import { loadProductionEnv, loadPublicEnv } from "@/mca-utils/env/load";
import { getCanonicalSiteOrigin } from "@/lib/seo/canonical-url";
import { parseEmbedAllowlist } from "@/lib/cors/embed-cors";

export type RequiredEnvCheck = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

const CANONICAL_HOST = "mycardarchive.com";

/**
 * Strict production validation — required keys, canonical domain, embed allowlist.
 */
export function assertRequiredProductionEnv(): RequiredEnvCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    loadPublicEnv({ throwOnError: true });
    loadProductionEnv({ throwOnError: true });
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    return { ok: false, errors, warnings };
  }

  const origin = getCanonicalSiteOrigin();
  if (!origin.includes(CANONICAL_HOST)) {
    errors.push(
      `NEXT_PUBLIC_SITE_URL must use canonical host ${CANONICAL_HOST} (got ${origin})`
    );
  }

  const embed = parseEmbedAllowlist(process.env.MCA_EMBED_ALLOWLIST);
  if (!embed.some((o) => o.includes(CANONICAL_HOST))) {
    warnings.push("MCA_EMBED_ALLOWLIST does not include mycardarchive.com");
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    warnings.push("SUPABASE_SERVICE_ROLE_KEY missing — invite redemption may fail");
  }

  if (process.env.MCA_INVITE_REQUIRED === "true" && !process.env.MCA_ADMIN_EMAILS?.trim()) {
    warnings.push("MCA_INVITE_REQUIRED without MCA_ADMIN_EMAILS — no admin signup bypass");
  }

  return { ok: errors.length === 0, errors, warnings };
}
