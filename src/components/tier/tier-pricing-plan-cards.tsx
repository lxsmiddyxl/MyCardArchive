"use client";

import { TierEmblem } from "@/components/tier/tier-emblem";
import { postStripeCheckout } from "@/lib/billing/stripe-checkout-client";
import { TIER_PLAN_TAGLINE, type PlanSlug } from "@/lib/tier/tier-plan-marketing";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { Button, ModalBase } from "@/mca-ui";
import { cn } from "@/lib/ui/cn";
import Link from "next/link";
import { useState } from "react";

const TEL = { componentName: "TierPricingPlanCards", surfaceName: "tier" } as const;

const PLAN_ORDER: PlanSlug[] = ["free", "pro", "elite", "business"];

export type TierPlanCardModel = {
  slug: PlanSlug;
  name: string;
  codename: string;
  monthlyPrice: number;
  yearlyPrice: number;
  scanLimit: number;
  binderLimit: number;
  cardLimit: number;
};

function money(n: number) {
  if (n <= 0) return "$0";
  return `$${n.toFixed(2)}`;
}

function isCurrent(current: string, slug: PlanSlug) {
  return current.toLowerCase() === slug;
}

function planRank(slug: string): number {
  const s = slug.toLowerCase() as PlanSlug;
  const i = PLAN_ORDER.indexOf(s);
  return i >= 0 ? i : 0;
}

type PaidCheckoutSlug = Exclude<PlanSlug, "free">;

function TierCheckoutConfirm({
  tier,
  open,
  onClose,
  onConfirm,
  loading,
}: {
  tier: PaidCheckoutSlug | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  const tierLabel =
    tier === "pro" ? "Pro" : tier === "elite" ? "Elite" : tier === "business" ? "Business" : "";
  return (
    <ModalBase
      isOpen={open}
      onClose={onClose}
      title={tier ? `Continue to ${tierLabel}?` : "Confirm"}
      panelClassName="max-w-md"
    >
      <p className="text-sm leading-relaxed text-mca-ink-muted">
        You&apos;ll leave MyCardArchive to complete checkout on Stripe. Your plan limits update after the
        subscription webhook runs.
      </p>
      <div className="mt-mca-lg flex flex-wrap justify-end gap-mca-sm">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="primary" disabled={loading || !tier} onClick={onConfirm}>
          {loading ? "Redirecting…" : "Continue to checkout"}
        </Button>
      </div>
    </ModalBase>
  );
}

export function TierPricingPlanCards({
  plans,
  currentSlug,
  billingEnabled,
  showBillingAnchor,
}: {
  plans: TierPlanCardModel[];
  currentSlug: string;
  billingEnabled: boolean;
  /** When Stripe is off, link users to the billing section for mock tier / history. */
  showBillingAnchor: boolean;
}) {
  const [confirmTier, setConfirmTier] = useState<PaidCheckoutSlug | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const slug = currentSlug.toLowerCase();
  const curRank = planRank(slug);

  async function runCheckout() {
    if (!confirmTier) return;
    setLoading(true);
    setMessage(null);
    mcaLog.event("tier.checkout.start", { tier: confirmTier, surface: "pricing_cards" }, TEL);
    const result = await postStripeCheckout({
      kind: "subscription",
      tier: confirmTier,
    });
    setLoading(false);
    if (result.ok) {
      window.location.href = result.url;
      return;
    }
    setMessage(result.error);
    mcaLog.warn("tier.checkout.fail", { tier: confirmTier }, TEL);
  }

  return (
    <div className="space-y-mca-lg">
      <TierCheckoutConfirm
        tier={confirmTier}
        open={confirmTier !== null}
        onClose={() => setConfirmTier(null)}
        onConfirm={() => void runCheckout()}
        loading={loading}
      />
      {message ? (
        <p className="text-sm text-mca-accent-border dark:text-mca-accent" role="status">
          {message}
        </p>
      ) : null}

      <div className="grid gap-mca-lg lg:grid-cols-4">
        {plans.map((p) => {
          const current = isCurrent(slug, p.slug);
          const popular = p.slug === "pro";
          const pr = planRank(p.slug);

          return (
            <article
              key={p.slug}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-mca-block border bg-mca-surface-elevated/80 p-mca-lg shadow-mca-panel dark:bg-mca-surface-elevated/50",
                popular
                  ? "border-mca-accent-strong/45 ring-1 ring-mca-accent-strong/25"
                  : "border-mca-border dark:border-mca-border-subtle",
                p.slug === "elite" && "border-mca-violet-border/35 dark:border-mca-violet-border/30",
                p.slug === "business" &&
                  "border-mca-violet-border/45 ring-1 ring-mca-violet-border/25 dark:border-mca-violet-border/35"
              )}
            >
              {popular ? (
                <p className="absolute right-mca-md top-mca-md rounded-full bg-mca-accent-strong/90 px-mca-sm py-mca-trace text-[0.65rem] font-bold uppercase tracking-wide text-white">
                  Popular
                </p>
              ) : null}
              {p.slug === "business" ? (
                <p className="absolute left-mca-md top-mca-md rounded-full border border-mca-accent-strong/40 bg-mca-accent-border/15 px-mca-sm py-mca-trace text-[0.6rem] font-semibold uppercase tracking-wide text-mca-warning-tint">
                  For shops &amp; graders
                </p>
              ) : null}
              <div className="mb-mca-md flex flex-col gap-mca-sm">
                <TierEmblem
                  tierSlug={p.slug}
                  variant="catalog"
                  alt={p.codename}
                  auraKey={p.slug === "elite" ? "nova" : p.slug === "business" ? "business" : undefined}
                  showAura
                  wrapperClassName="max-w-[200px]"
                />
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-mca-ink-strong">{p.name}</h3>
                  <p className="mt-mca-xs text-sm leading-relaxed text-mca-ink-muted">
                    {TIER_PLAN_TAGLINE[p.slug]}
                  </p>
                </div>
              </div>

              <div className="mb-mca-lg space-y-mca-xs border-y border-mca-border/60 py-mca-lg dark:border-mca-border-subtle/80">
                <p className="flex items-baseline gap-mca-sm">
                  <span className="text-3xl font-bold tabular-nums text-mca-ink-strong">
                    {money(p.monthlyPrice)}
                  </span>
                  <span className="text-sm text-mca-ink-subtle">/ month</span>
                </p>
                {p.yearlyPrice > 0 ? (
                  <p className="text-mca-caption text-mca-ink-muted">
                    {money(p.yearlyPrice)} / year when billed annually
                  </p>
                ) : (
                  <p className="text-mca-caption text-mca-ink-muted">No subscription required</p>
                )}
                <dl className="mt-mca-md space-y-mca-xs text-sm text-mca-ink-muted">
                  <div className="flex justify-between gap-mca-base">
                    <dt>Monthly scans</dt>
                    <dd className="font-semibold tabular-nums text-mca-ink-body">
                      {p.scanLimit.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-mca-base">
                    <dt>Binders</dt>
                    <dd className="font-medium tabular-nums text-mca-ink-body">
                      {p.binderLimit.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-mca-base">
                    <dt>Cards</dt>
                    <dd className="font-medium tabular-nums text-mca-ink-body">
                      {p.cardLimit.toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>

              <ul className="mb-mca-lg flex-1 space-y-mca-xs text-sm text-mca-ink-muted">
                <li className="flex gap-mca-sm">
                  <span className="text-mca-accent" aria-hidden>
                    ✓
                  </span>
                  <span>Trading, matching &amp; grading tools</span>
                </li>
                <li className="flex gap-mca-sm">
                  <span className="text-mca-accent" aria-hidden>
                    ✓
                  </span>
                  <span>Cloud sync &amp; binder vault</span>
                </li>
                {p.slug !== "free" ? (
                  <li className="flex gap-mca-sm">
                    <span className="text-mca-accent" aria-hidden>
                      ✓
                    </span>
                    <span>
                      {p.slug === "business"
                        ? "Unlimited batch capture, auto-crop & auto-rotate"
                        : "Batch capture, auto-crop & auto-rotate"}
                    </span>
                  </li>
                ) : (
                  <li className="flex gap-mca-sm text-mca-ink-subtle">
                    <span aria-hidden>—</span>
                    <span>Single-image manual scans (batch on Pro+)</span>
                  </li>
                )}
                {(p.slug === "elite" || p.slug === "business") && (
                  <li className="flex gap-mca-sm">
                    <span className="text-mca-accent" aria-hidden>
                      ✓
                    </span>
                    <span>Priority scan queue when traffic is high</span>
                  </li>
                )}
                {p.slug === "business" ? (
                  <li className="flex gap-mca-sm">
                    <span className="text-mca-accent" aria-hidden>
                      ✓
                    </span>
                    <span>CSV export of your collection</span>
                  </li>
                ) : null}
              </ul>

              <div className="mt-auto space-y-mca-sm">
                {p.slug === "free" ? (
                  current ? (
                    <span className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-border-subtle bg-mca-chrome/40 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-muted">
                      Current plan
                    </span>
                  ) : (
                    <span className="block text-center text-xs text-mca-ink-subtle">
                      Free is the default starter plan.
                    </span>
                  )
                ) : null}

                {p.slug === "pro" ? (
                  current ? (
                    <span className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-accent-strong/40 bg-mca-accent-border/15 px-mca-base py-mca-sm text-sm font-semibold text-mca-warning-tint">
                      Your Pro plan
                    </span>
                  ) : curRank > pr ? (
                    <span className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-border-subtle bg-mca-chrome/30 px-mca-base py-mca-sm text-sm text-mca-ink-muted">
                      {curRank >= 3 ? "Included in Business" : "Included in Elite"}
                    </span>
                  ) : billingEnabled ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setConfirmTier("pro")}
                      className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-accent-strong/50 bg-mca-accent-border/20 px-mca-base py-mca-sm text-sm font-semibold text-mca-warning-tint transition hover:bg-mca-accent-border/30 disabled:opacity-50"
                    >
                      Upgrade to Pro
                    </button>
                  ) : (
                    <Link
                      href="#billing"
                      className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome/60 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-strong hover:bg-mca-border-subtle/60"
                    >
                      View billing &amp; upgrades
                    </Link>
                  )
                ) : null}

                {p.slug === "elite" ? (
                  current ? (
                    <span className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-violet-border/50 bg-mca-violet-surface/20 px-mca-base py-mca-sm text-sm font-semibold text-mca-violet-text">
                      Your Elite plan
                    </span>
                  ) : curRank > pr ? (
                    <span className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-border-subtle bg-mca-chrome/30 px-mca-base py-mca-sm text-sm text-mca-ink-muted">
                      Included in Business
                    </span>
                  ) : billingEnabled ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setConfirmTier("elite")}
                      className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-violet-border/50 bg-mca-violet-surface/25 px-mca-base py-mca-sm text-sm font-semibold text-mca-violet-text transition hover:bg-mca-violet-surface/35 disabled:opacity-50"
                    >
                      Upgrade to Elite
                    </button>
                  ) : (
                    <Link
                      href="#billing"
                      className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome/60 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-strong hover:bg-mca-border-subtle/60"
                    >
                      View billing &amp; upgrades
                    </Link>
                  )
                ) : null}

                {p.slug === "business" ? (
                  current ? (
                    <span className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-violet-border/50 bg-mca-violet-surface/20 px-mca-base py-mca-sm text-sm font-semibold text-mca-violet-text">
                      Your Business plan
                    </span>
                  ) : billingEnabled ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setConfirmTier("business")}
                      className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-violet-border/50 bg-mca-violet-surface/25 px-mca-base py-mca-sm text-sm font-semibold text-mca-violet-text transition hover:bg-mca-violet-surface/35 disabled:opacity-50"
                    >
                      Upgrade to Business
                    </button>
                  ) : (
                    <Link
                      href="#billing"
                      className="inline-flex w-full items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome/60 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-strong hover:bg-mca-border-subtle/60"
                    >
                      View billing &amp; upgrades
                    </Link>
                  )
                ) : null}

                {showBillingAnchor &&
                (p.slug === "pro" || p.slug === "elite" || p.slug === "business") ? (
                  <Link
                    href="#billing"
                    className="block text-center text-xs font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline"
                  >
                    Manage subscription &amp; invoices
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
