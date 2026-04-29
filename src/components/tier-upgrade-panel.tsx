"use client";

import { TierUpgradeButtons } from "@/components/tier-upgrade-buttons";

const MOCK_TIERS = [
  { slug: "free", name: "Free" },
  { slug: "pro", name: "Pro" },
  { slug: "elite", name: "Elite" },
  { slug: "business", name: "Business" },
];

type Props = {
  tier: string;
  anyLimitReached: boolean;
};

export function TierUpgradePanel({ tier, anyLimitReached }: Props) {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (!anyLimitReached) {
    return null;
  }

  return (
    <div
      id="tier-upgrade"
      className="rounded-mca-sheet border border-mca-accent-strong/30 bg-mca-surface-elevated/50 p-mca-lg shadow-[0_4px_24px_-4px_rgba(245,158,11,0.15)]"
    >
      <h3 className="text-sm font-semibold text-mca-ink-strong">
        Upgrade your plan (dev mock)
      </h3>
      <p className="mt-mca-sm text-sm leading-relaxed text-mca-ink-subtle">
        You&apos;ve hit a limit. In development you can bump limits with the
        mock RPC; in production use Stripe billing on the tier page.
      </p>
      <div className="mt-mca-comfortable">
        <TierUpgradeButtons tiers={MOCK_TIERS} currentSlug={tier} />
      </div>
    </div>
  );
}
