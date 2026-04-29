/**
 * Build-time public flags (`NEXT_PUBLIC_MCA_FF_*`). Add new keys here so Next inlines them on the client.
 */
export function getKnownPublicFeatureFlags(): Record<string, boolean> {
  return {
    MARKETPLACE:
      process.env.NEXT_PUBLIC_MCA_FF_MARKETPLACE === "1" ||
      process.env.NEXT_PUBLIC_MCA_FF_MARKETPLACE === "true",
    MOBILE_TABS:
      process.env.NEXT_PUBLIC_MCA_FF_MOBILE_TABS === "1" ||
      process.env.NEXT_PUBLIC_MCA_FF_MOBILE_TABS === "true",
  };
}
