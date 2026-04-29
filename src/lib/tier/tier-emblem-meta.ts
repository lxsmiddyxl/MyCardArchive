/** Drives aura visuals, tooltips, and profile header accents (Nova vs Apex share `elite` slug). */
export type TierAuraKey = "ember" | "spark" | "nova" | "apex" | "business";

const TOOLTIP_COPY: Record<TierAuraKey, { name: string; description: string }> = {
  ember: {
    name: "Ember",
    description: "Starter tier — get your collection online with core limits.",
  },
  spark: {
    name: "Spark",
    description: "Pro plan — more binders, cards, and monthly scans to grow.",
  },
  nova: {
    name: "Nova",
    description: "Elite tier — top limits for serious collectors and high volume.",
  },
  apex: {
    name: "Apex",
    description: "Legacy top codename — same Elite limits and emblem as Nova.",
  },
  business: {
    name: "Business",
    description: "Built for shops, graders, and high-volume sellers — top limits and shop tools.",
  },
};

export function tierAuraKeyFromSlug(tierSlug: string, brand?: "nova" | "apex"): TierAuraKey {
  const s = tierSlug.trim().toLowerCase();
  if (s === "free") return "ember";
  if (s === "pro") return "spark";
  if (s === "business") return "business";
  if (s === "elite") return brand === "apex" ? "apex" : "nova";
  return "ember";
}

/** Tooltip + accent identity: pass `brand: 'apex'` when showcasing Apex on elite slug. */
export function resolveTierAuraKey(tierSlug: string, explicit?: TierAuraKey): TierAuraKey {
  if (explicit) return explicit;
  return tierAuraKeyFromSlug(tierSlug);
}

export function tierEmblemTooltipCopy(auraKey: TierAuraKey): { name: string; description: string } {
  return TOOLTIP_COPY[auraKey];
}

/** Subtle profile header shell accent (combine with existing layout classes). */
export function tierProfileHeaderAccentClass(auraKey: TierAuraKey): string {
  const key = auraKey === "business" ? "nova" : auraKey;
  return `mca-profile-tier-glow mca-profile-tier-glow--${key}`;
}

/**
 * Marketing codenames shown beside tier artwork (legacy Ember / Spark / Nova / Apex naming).
 * Runtime `user_tiers.tier_slug` is free | pro | elite | business.
 */
export function tierEmblemDisplayName(slug: string): string {
  switch (slug.trim().toLowerCase()) {
    case "free":
      return "Ember";
    case "pro":
      return "Spark";
    case "elite":
      return "Nova";
    case "business":
      return "Business";
    default:
      return slug.trim() || "Tier";
  }
}

/** Accessibility: short label for the emblem (tier codename). */
export function tierEmblemAltText(slug: string): string {
  return tierEmblemDisplayName(slug);
}

/**
 * Canonical tier buckets for public profile shell styling (card + stats row).
 * Maps legacy codenames to live slugs. Empty / unknown → free (neutral shell).
 */
export type ProfileShellTierSlug = "free" | "pro" | "elite" | "business";

export function profileShellTierFromUserSlug(
  tierSlug: string | null | undefined
): ProfileShellTierSlug {
  const s = (tierSlug ?? "").trim().toLowerCase();
  if (s === "pro" || s === "spark") return "pro";
  if (s === "elite" || s === "nova" || s === "apex") return "elite";
  if (s === "business") return "business";
  return "free";
}

/** Main profile hero card: border, gradient, glow, hover shimmer (see globals.css). */
export function profileCardClass(tierSlug: string | null | undefined): string {
  const t = profileShellTierFromUserSlug(tierSlug);
  return `mca-profile-card mca-profile-card--${t}`;
}

/** Activity stats grid: separators, chip accents, meter tint (see globals.css). */
export function profileStatsAccentClass(tierSlug: string | null | undefined): string {
  const t = profileShellTierFromUserSlug(tierSlug);
  return `mca-profile-stats mca-profile-stats--${t}`;
}
