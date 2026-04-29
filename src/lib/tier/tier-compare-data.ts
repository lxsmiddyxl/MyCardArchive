/** Marketing + comparison grid — numeric caps mirror `public.tiers` defaults (not enforced here). */

export type TierCompareRow = {
  feature: string;
  free: string;
  pro: string;
  elite: string;
  business: string;
};

/** @deprecated Use `TierCompareFeatureRow` + `TierCompareFeatureTable` for the full matrix. */
export const TIER_COMPARE_ROWS: TierCompareRow[] = [
  {
    feature: "Binders",
    free: "Starter shelf",
    pro: "Higher shelf capacity",
    elite: "Maximum shelf capacity",
    business: "Maximum shelf capacity",
  },
  {
    feature: "Cards in collection",
    free: "Core collection",
    pro: "Expanded collection",
    elite: "Largest collection",
    business: "Largest collection",
  },
  {
    feature: "Monthly scans",
    free: "Limited",
    pro: "More scans / month",
    elite: "Top scan allowance",
    business: "20,000 / month",
  },
  {
    feature: "Trading & matching",
    free: "Included",
    pro: "Included",
    elite: "Included",
    business: "Included",
  },
  {
    feature: "Grading insights",
    free: "Included",
    pro: "Included",
    elite: "Included",
    business: "Included",
  },
];

export type TierCompareCell =
  | { kind: "text"; value: string }
  | { kind: "check"; label?: string }
  | { kind: "dash" }
  | { kind: "badge"; value: string };

export type TierCompareFeatureRow = {
  feature: string;
  free: TierCompareCell;
  pro: TierCompareCell;
  elite: TierCompareCell;
  business: TierCompareCell;
};

export type TierPlanLimits = {
  free: { binder: number; card: number; scan: number };
  pro: { binder: number; card: number; scan: number };
  elite: { binder: number; card: number; scan: number };
  business: { binder: number; card: number; scan: number };
};

/** Canonical defaults aligned with `public.tiers` seed / `ensure-tier` free row. */
export const DEFAULT_TIER_PLAN_LIMITS: TierPlanLimits = {
  free: { binder: 1, card: 500, scan: 50 },
  pro: { binder: 5, card: 5000, scan: 500 },
  elite: { binder: 50, card: 50000, scan: 5000 },
  business: { binder: 50, card: 50000, scan: 20000 },
};

type TierRowLimits = {
  slug: string;
  binder_limit: number | null;
  card_limit: number | null;
  scan_limit: number | null;
};

/** Overlay `public.tiers` rows onto defaults when the catalog is available. */
export function mergePlanLimitsFromTierRows(rows: TierRowLimits[] | null): TierPlanLimits {
  const out: TierPlanLimits = {
    free: { ...DEFAULT_TIER_PLAN_LIMITS.free },
    pro: { ...DEFAULT_TIER_PLAN_LIMITS.pro },
    elite: { ...DEFAULT_TIER_PLAN_LIMITS.elite },
    business: { ...DEFAULT_TIER_PLAN_LIMITS.business },
  };
  if (!rows?.length) return out;
  const apply = (slug: keyof TierPlanLimits) => {
    const row = rows.find((r) => r.slug?.toLowerCase() === slug);
    if (!row) return;
    if (row.binder_limit != null) out[slug].binder = row.binder_limit;
    if (row.card_limit != null) out[slug].card = row.card_limit;
    if (row.scan_limit != null) out[slug].scan = row.scan_limit;
  };
  apply("free");
  apply("pro");
  apply("elite");
  apply("business");
  return out;
}

const fmt = (n: number) => (n <= 0 ? "Unlimited" : n.toLocaleString());

/**
 * Builds comparison rows from live `tiers` table limits (falls back to canonical defaults).
 */
export function buildTierCompareFeatureRows(limits: TierPlanLimits): TierCompareFeatureRow[] {
  const { free, pro, elite, business } = limits;
  return [
    {
      feature: "Monthly scans",
      free: { kind: "text", value: `${fmt(free.scan)}/mo` },
      pro: { kind: "text", value: `${fmt(pro.scan)}/mo` },
      elite: { kind: "text", value: `${fmt(elite.scan)}/mo` },
      business: { kind: "text", value: `${fmt(business.scan)}/mo` },
    },
    {
      feature: "Batch scanning",
      free: { kind: "dash" },
      pro: { kind: "check", label: "Multi-file & queue" },
      elite: { kind: "check", label: "Multi-file & queue" },
      business: { kind: "check", label: "Unlimited batch" },
    },
    {
      feature: "Auto-crop",
      free: { kind: "dash" },
      pro: { kind: "check" },
      elite: { kind: "check" },
      business: { kind: "check" },
    },
    {
      feature: "Auto-rotate",
      free: { kind: "dash" },
      pro: { kind: "check" },
      elite: { kind: "check" },
      business: { kind: "check" },
    },
    {
      feature: "Queue priority",
      free: { kind: "dash" },
      pro: { kind: "dash" },
      elite: { kind: "check", label: "Elite priority lane" },
      business: { kind: "check", label: "Priority lane" },
    },
    {
      feature: "Multi-scan mode",
      free: { kind: "dash" },
      pro: { kind: "check" },
      elite: { kind: "check" },
      business: { kind: "check" },
    },
    {
      feature: "CSV export",
      free: { kind: "dash" },
      pro: { kind: "dash" },
      elite: { kind: "dash" },
      business: { kind: "badge", value: "Business only" },
    },
    {
      feature: "Binders",
      free: { kind: "text", value: fmt(free.binder) },
      pro: { kind: "text", value: fmt(pro.binder) },
      elite: { kind: "text", value: fmt(elite.binder) },
      business: { kind: "text", value: fmt(business.binder) },
    },
    {
      feature: "Cards in collection",
      free: { kind: "text", value: fmt(free.card) },
      pro: { kind: "text", value: fmt(pro.card) },
      elite: { kind: "text", value: fmt(elite.card) },
      business: { kind: "text", value: fmt(business.card) },
    },
    {
      feature: "Storage & vault",
      free: { kind: "text", value: "Core cloud sync" },
      pro: { kind: "text", value: "Expanded vault" },
      elite: { kind: "text", value: "Maximum vault" },
      business: { kind: "text", value: "Maximum vault" },
    },
    {
      feature: "Profile perks",
      free: { kind: "text", value: "Standard profile" },
      pro: { kind: "text", value: "Pro profile flair" },
      elite: { kind: "text", value: "Elite profile flair" },
      business: { kind: "text", value: "Elite profile flair" },
    },
    {
      feature: "Tier emblem",
      free: { kind: "badge", value: "Ember" },
      pro: { kind: "badge", value: "Spark" },
      elite: { kind: "badge", value: "Nova / Apex" },
      business: { kind: "badge", value: "Business" },
    },
    {
      feature: "Trading & matching",
      free: { kind: "check" },
      pro: { kind: "check" },
      elite: { kind: "check" },
      business: { kind: "check" },
    },
  ];
}
