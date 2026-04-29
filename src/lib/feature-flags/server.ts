import "server-only";

/**
 * Server-only flags (not exposed to the client bundle). `MCA_FF_<KEY>=1|true`
 */
export function isServerFeatureEnabled(flagKey: string): boolean {
  const k = flagKey.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const raw = process.env[`MCA_FF_${k}`];
  return raw === "1" || raw === "true" || raw === "yes";
}
