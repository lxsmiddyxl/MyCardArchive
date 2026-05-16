import { parseProductionEnv, parsePublicEnv, type ProductionEnv, type PublicEnv } from "@/mca-utils/env/schema";

let cachedPublic: PublicEnv | null = null;
let cachedProduction: ProductionEnv | null = null;

/**
 * Load and validate public env (fail-fast).
 */
export function loadPublicEnv(opts?: { throwOnError?: boolean }): PublicEnv | null {
  if (cachedPublic) return cachedPublic;
  try {
    cachedPublic = parsePublicEnv();
    return cachedPublic;
  } catch (err) {
    if (opts?.throwOnError ?? process.env.NODE_ENV === "production") throw err;
    return null;
  }
}

/**
 * Load full production env schema (fail-fast in production).
 */
export function loadProductionEnv(opts?: { throwOnError?: boolean }): ProductionEnv | null {
  if (cachedProduction) return cachedProduction;
  try {
    cachedProduction = parseProductionEnv();
    return cachedProduction;
  } catch (err) {
    if (opts?.throwOnError ?? process.env.NODE_ENV === "production") throw err;
    return null;
  }
}

/** Reset caches (tests). */
export function resetEnvCache(): void {
  cachedPublic = null;
  cachedProduction = null;
}
