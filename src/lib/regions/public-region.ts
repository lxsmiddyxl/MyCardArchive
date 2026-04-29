/**
 * Browser-safe region label for telemetry and UI (set at build time).
 */
export function getClientRegionLabel(): string {
  return (
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MCA_REGION?.trim()) ||
    "primary"
  );
}
