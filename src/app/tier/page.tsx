import { SeasonalEventLiveBannerTier } from "@/components/seasonal/seasonal-event-live-banner";
import { listActiveSeasonalBannerLines } from "@/lib/events/seasonal-events";
import { TierArtworkStrip } from "@/components/artwork/artwork-surfaces";
import {
  ScanPackPurchasePanel,
  type ScanPackOffer,
} from "@/components/billing/scan-pack-purchase-panel";
import { TierScanPackSuccessBanner } from "@/components/billing/tier-scan-pack-success-banner";
import { BillingActions } from "@/components/billing-actions";
import { SurfaceMountTelemetry } from "@/components/telemetry/surface-mount-telemetry";
import { TierCompareMount } from "@/components/tier/tier-compare-telemetry";
import { TierCompareFeatureTable } from "@/components/tier/tier-compare-feature-table";
import {
  TierPricingPlanCards,
  type TierPlanCardModel,
} from "@/components/tier/tier-pricing-plan-cards";
import { TierUpgradeButtons } from "@/components/tier-upgrade-buttons";
import {
  buildTierCompareFeatureRows,
  mergePlanLimitsFromTierRows,
} from "@/lib/tier/tier-compare-data";
import { logServerError } from "@/lib/server/observability";
import {
  getBinderCount,
  getCardCount,
  getScanCountThisMonth,
  getUserTier,
  isUnlimitedScans,
  remainingScansThisMonth,
} from "@/lib/tier/check-limits";
import {
  effectiveScanPackUnitCents,
  listScanPackDefinitions,
} from "@/lib/billing/scan-packs-config";
import { ensureUserTier } from "@/lib/tier/ensure-tier";
import type { PlanSlug } from "@/lib/tier/tier-plan-marketing";
import { resolveTierAuraKey } from "@/lib/tier/tier-emblem-meta";
import { cn } from "@/lib/ui/cn";
import { createClient } from "@/lib/supabase/server";
import { isStripeConfigured } from "@/lib/stripe/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Plans & pricing",
};

const MOCK_TIER_OPTIONS: { slug: PlanSlug; name: string }[] = [
  { slug: "free", name: "Free" },
  { slug: "pro", name: "Pro" },
  { slug: "elite", name: "Elite" },
  { slug: "business", name: "Business" },
];

function isPlanSlug(slug: string): slug is PlanSlug {
  return (
    slug === "free" || slug === "pro" || slug === "elite" || slug === "business"
  );
}

function tierTitle(slug: string): string {
  if (isPlanSlug(slug)) {
    return MOCK_TIER_OPTIONS.find((t) => t.slug === slug)!.name;
  }
  return slug;
}

function numericCap(limit: number): number | null {
  return limit <= 0 ? null : limit;
}

function limitLabel(limit: number): string {
  return limit <= 0 ? "∞" : limit.toLocaleString();
}

function buildScanPackOffers(): ScanPackOffer[] {
  return listScanPackDefinitions().map((d) => ({
    id: d.id,
    label: d.label,
    blurb: d.blurb,
    bonusScans: d.bonusScans,
    priceLabel: `$${(effectiveScanPackUnitCents(d.id) / 100).toFixed(2)}`,
  }));
}

function UsageBar({
  label,
  used,
  cap,
  capDisplay,
}: {
  label: string;
  used: number;
  cap: number | null;
  capDisplay: string;
}) {
  const unlimited = cap == null;
  const pct = unlimited ? 100 : Math.min(100, (used / cap) * 100);
  const atCap = !unlimited && used >= cap;

  return (
    <div className="space-y-mca-sm">
      <div className="flex items-end justify-between gap-mca-compact text-sm">
        <span className="font-medium text-mca-ink-soft">{label}</span>
        <span
          className={`tabular-nums ${atCap ? "text-mca-accent" : "text-mca-ink-muted"}`}
        >
          {used.toLocaleString()} / {capDisplay}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-mca-chrome">
        <div
          className={`h-full rounded-full transition-all ${
            unlimited
              ? "bg-mca-neutral-dot/45"
              : atCap
                ? "bg-mca-accent-strong/90"
                : "bg-mca-accent-strong/60"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function isBillingConfigured(): boolean {
  return (
    isStripeConfigured() &&
    Boolean(process.env.STRIPE_PRICE_PRO?.trim()) &&
    Boolean(process.env.STRIPE_PRICE_ELITE?.trim())
  );
}

type TierCatalogRow = {
  slug: string;
  name: string;
  description: string | null;
  monthly_price: number | null;
  yearly_price: number | null;
  binder_limit: number | null;
  card_limit: number | null;
  scan_limit: number | null;
  sort_order: number | null;
};

function pickCatalogRow(rows: TierCatalogRow[] | null, slug: PlanSlug): TierCatalogRow | null {
  return rows?.find((r) => r.slug?.toLowerCase() === slug) ?? null;
}

function buildPlanCards(
  catalog: TierCatalogRow[] | null,
  limits: ReturnType<typeof mergePlanLimitsFromTierRows>
): TierPlanCardModel[] {
  const fallbackMonthly: Record<PlanSlug, number> = {
    free: 0,
    pro: 4.99,
    elite: 19.99,
    business: 49.99,
  };
  const fallbackYearly: Record<PlanSlug, number> = {
    free: 0,
    pro: 49.99,
    elite: 199.99,
    business: 499.99,
  };
  const codename: Record<PlanSlug, string> = {
    free: "Ember",
    pro: "Spark",
    elite: "Nova",
    business: "Business",
  };

  return (["free", "pro", "elite", "business"] as const).map((slug) => {
    const row = pickCatalogRow(catalog, slug);
    const L = limits[slug];
    return {
      slug,
      name: row?.name?.trim() || tierTitle(slug),
      codename: codename[slug],
      monthlyPrice: Number(row?.monthly_price ?? fallbackMonthly[slug]),
      yearlyPrice: Number(row?.yearly_price ?? fallbackYearly[slug]),
      scanLimit: L.scan,
      binderLimit: L.binder,
      cardLimit: L.card,
    };
  });
}

export default async function TierPage() {
  const isDev = process.env.NODE_ENV !== "production";
  const billingEnabled = isBillingConfigured();

  const supabase = createClient();
  let user: { id: string } | null = null;
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch {
    redirect("/login?next=/tier");
  }

  if (!user) {
    redirect("/login?next=/tier");
  }

  try {
    await ensureUserTier(supabase);
  } catch {
    /* tier row optional; page still renders */
  }

  let tierCatalog: TierCatalogRow[] | null = null;
  try {
    const { data } = await supabase
      .from("tiers")
      .select(
        "slug,name,description,monthly_price,yearly_price,binder_limit,card_limit,scan_limit,sort_order"
      )
      .order("sort_order", { ascending: true });
    tierCatalog = (data as TierCatalogRow[] | null) ?? null;
  } catch {
    tierCatalog = null;
  }

  const planLimits = mergePlanLimitsFromTierRows(
    tierCatalog?.map((r) => ({
      slug: r.slug,
      binder_limit: r.binder_limit,
      card_limit: r.card_limit,
      scan_limit: r.scan_limit,
    })) ?? null
  );
  const planCards = buildPlanCards(tierCatalog, planLimits);
  const compareFeatureRows = buildTierCompareFeatureRows(planLimits);

  let hasStripeCustomer = false;
  if (user) {
    const { data: cust } = await supabase
      .from("stripe_customers")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    hasStripeCustomer = Boolean(cust);
  }

  let tier: Awaited<ReturnType<typeof getUserTier>> = null;
  let binderCount = 0;
  let cardCount = 0;
  let scanCount = 0;
  let usageLoadError: string | null = null;
  try {
    [tier, binderCount, cardCount, scanCount] = await Promise.all([
      getUserTier(supabase),
      getBinderCount(supabase),
      getCardCount(supabase),
      getScanCountThisMonth(supabase),
    ]);
  } catch (e) {
    usageLoadError =
      e instanceof Error ? e.message : "Could not load plan usage. Try again later.";
    logServerError({ scope: "ssr", route: "/tier", userId: user.id, err: e });
  }

  const scanCap =
    tier != null && !isUnlimitedScans(tier.scan_limit) ? tier.scan_limit : null;

  const atBinderLimit =
    tier != null && tier.binder_limit > 0 && binderCount >= tier.binder_limit;
  const atCardLimit = tier != null && tier.card_limit > 0 && cardCount >= tier.card_limit;
  const atScanLimit =
    tier != null &&
    !isUnlimitedScans(tier.scan_limit) &&
    remainingScansThisMonth(tier, scanCount) === 0;
  const anyLimitReached = atBinderLimit || atCardLimit || atScanLimit;
  const scanPackOffers = buildScanPackOffers();

  const heroSlug = tier?.tier_slug ?? "free";
  const heroAuraKey = resolveTierAuraKey(heroSlug);
  const currentSlug = tier?.tier_slug ?? "free";
  const seasonalBannerLines = listActiveSeasonalBannerLines("tier");

  return (
    <div className="relative space-y-mca-2xl pb-mca-xl pt-mca-sm">
      <SurfaceMountTelemetry name="tier-page" surfaceName="tier" />

      <SeasonalEventLiveBannerTier lines={seasonalBannerLines} />

      <Suspense fallback={null}>
        <TierScanPackSuccessBanner />
      </Suspense>

      {/* Hero — aura + strip only here */}
      <section
        className="relative overflow-hidden rounded-mca-sheet border border-mca-border/80 bg-mca-surface-elevated/40 px-mca-lg py-mca-2xl shadow-mca-panel dark:border-mca-border-subtle/80 sm:px-mca-2xl"
        aria-labelledby="tier-pricing-hero-heading"
      >
        <div
          className={cn(
            "mca-tier-aura pointer-events-none absolute inset-x-[-8%] -top-4 bottom-[-20%] z-0 rounded-mca-block opacity-90",
            heroAuraKey === "ember" && "mca-tier-aura--ember",
            heroAuraKey === "spark" && "mca-tier-aura--spark",
            (heroAuraKey === "nova" || heroAuraKey === "business") &&
              "mca-tier-aura--nova",
            heroAuraKey === "apex" && "mca-tier-aura--apex"
          )}
          aria-hidden
        />
        <div className="relative z-[1] space-y-mca-lg">
          <TierArtworkStrip tierSlug={heroSlug} />
          <div className="space-y-mca-compact">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mca-accent-strong/90">
              Membership
            </p>
            <h1
              id="tier-pricing-hero-heading"
              className="max-w-3xl text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl"
            >
              Plans built for every collector
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-mca-ink-muted sm:text-lg">
              Choose Free to get started, Pro for batch-friendly scanning and higher limits, Elite for top
              capacity and priority, or Business for shops and bulk workflows. Limits and prices come from
              your live plan catalog—what you see here matches what the app enforces.
            </p>
          </div>
        </div>
      </section>

      {usageLoadError ? (
        <div className="rounded-mca-block border border-mca-accent-strong/35 bg-mca-warning-surface/25 px-mca-md py-mca-sm text-mca-body text-mca-warning-tint">
          {usageLoadError} Limits and usage bars may be incomplete until this resolves.
        </div>
      ) : null}

      {/* Pricing cards */}
      <section className="space-y-mca-md" aria-labelledby="choose-plan-heading">
        <h2 id="choose-plan-heading" className="text-sm font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Choose your plan
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
          Upgrade anytime; paid changes run through Stripe Checkout or your billing portal.
        </p>
        <TierPricingPlanCards
          plans={planCards}
          currentSlug={currentSlug}
          billingEnabled={billingEnabled}
          showBillingAnchor={billingEnabled || hasStripeCustomer || isDev}
        />
      </section>

      <section
        className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/60 p-mca-lg dark:border-mca-border-subtle sm:p-mca-xl"
        aria-labelledby="scan-packs-heading"
      >
        <h2
          id="scan-packs-heading"
          className="text-sm font-semibold uppercase tracking-wide text-mca-ink-subtle"
        >
          Need more scans?
        </h2>
        <p className="mt-mca-sm max-w-2xl text-sm text-mca-ink-muted">
          Running low on scans? Top up with a scan pack — one-time purchase, no subscription. Bonus balance is used after
          your plan&apos;s monthly allowance.
        </p>
        <div className="mt-mca-lg">
          <ScanPackPurchasePanel packs={scanPackOffers} billingEnabled={billingEnabled} />
        </div>
      </section>

      {anyLimitReached ? (
        <div className="rounded-mca-block border border-mca-accent-strong/35 bg-mca-warning-surface/25 px-mca-comfortable py-mca-base text-sm text-mca-warning-tint shadow-mca-panel">
          <p className="font-medium">You&apos;re at a plan limit</p>
          <p className="mt-mca-xs text-mca-nav-accent/80">
            {isDev
              ? "Upgrade via Stripe below, use mock tier switches for local testing, or free space by removing items."
              : "Upgrade your plan below or free space by removing items."}
          </p>
          <Link
            href="#billing"
            className="mt-mca-compact inline-flex text-sm font-semibold text-mca-accent underline-offset-2 hover:underline"
          >
            Billing & upgrades
          </Link>
          {isDev ? (
            <Link
              href="#mock-tier-switcher"
              className="mt-mca-compact ml-mca-base inline-flex text-sm font-semibold text-mca-accent/80 underline-offset-2 hover:underline"
            >
              Mock tier (dev)
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Current plan + usage */}
      <section
        className="relative overflow-hidden rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 p-mca-lg shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card dark:border-mca-border-subtle sm:p-mca-xl"
        aria-labelledby="current-tier-heading"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-mca-accent-strong/10 blur-3xl"
          aria-hidden
        />
        <h2 id="current-tier-heading" className="text-xs font-semibold uppercase tracking-[0.2em] text-mca-accent/90">
          Your plan &amp; usage
        </h2>
        <p className="mt-mca-sm max-w-2xl text-sm text-mca-ink-muted">
          Active row in{" "}
          <code className="rounded bg-mca-chrome/80 px-mca-micro py-mca-trace text-xs">user_tiers</code>
          — usage is RLS-scoped to your account.
        </p>
        {tier ? (
          <>
            <p className="mt-mca-lg text-2xl font-semibold tracking-tight text-mca-ink-strong sm:text-3xl">
              {tierTitle(tier.tier_slug)}
            </p>
            <p className="mt-mca-sm text-xs uppercase tracking-wider text-mca-ink-subtle">
              tier_slug:{" "}
              <span className="font-mono text-mca-ink-muted">{tier.tier_slug}</span>
              {isPlanSlug(tier.tier_slug) ? (
                <span className="text-mca-hint"> (catalog tier)</span>
              ) : null}
            </p>

            <dl className="mt-mca-xl grid gap-mca-base border-t border-mca-border pt-mca-xl sm:grid-cols-2 lg:grid-cols-4 dark:border-mca-border-subtle">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-mca-ink-subtle">
                  Binder limit
                </dt>
                <dd className="mt-mca-xs text-lg font-semibold tabular-nums text-mca-ink-strong">
                  {limitLabel(tier.binder_limit)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-mca-ink-subtle">
                  Card limit
                </dt>
                <dd className="mt-mca-xs text-lg font-semibold tabular-nums text-mca-ink-strong">
                  {limitLabel(tier.card_limit)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-mca-ink-subtle">
                  Scan limit (monthly)
                </dt>
                <dd className="mt-mca-xs text-lg font-semibold tabular-nums text-mca-ink-strong">
                  {limitLabel(tier.scan_limit)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-mca-ink-subtle">
                  Bonus scans
                </dt>
                <dd className="mt-mca-xs text-lg font-semibold tabular-nums text-mca-ink-strong">
                  {(tier.bonus_scans_remaining ?? 0).toLocaleString()}
                </dd>
              </div>
            </dl>

            <div className="mt-mca-section space-y-mca-lg border-t border-mca-border pt-mca-xl dark:border-mca-border-subtle">
              <UsageBar
                label="Binders"
                used={binderCount}
                cap={numericCap(tier.binder_limit)}
                capDisplay={limitLabel(tier.binder_limit)}
              />
              <UsageBar
                label="Cards"
                used={cardCount}
                cap={numericCap(tier.card_limit)}
                capDisplay={limitLabel(tier.card_limit)}
              />
              <UsageBar
                label="Scans (this month)"
                used={scanCount}
                cap={scanCap}
                capDisplay={scanCap == null ? "∞" : scanCap.toLocaleString()}
              />
            </div>
          </>
        ) : (
          <div className="relative mt-mca-lg">
            <p className="text-lg font-medium text-mca-nav-accent/90">No tier row</p>
            <p className="mt-mca-sm max-w-lg text-sm leading-relaxed text-mca-ink-muted">
              Call{" "}
              <code className="rounded bg-mca-chrome/80 px-mca-micro py-mca-trace text-xs">
                GET /api/tier/repair
              </code>{" "}
              while signed in, or run your latest{" "}
              <code className="rounded bg-mca-chrome/80 px-mca-micro py-mca-trace text-xs">
                user_tiers
              </code>{" "}
              migration so a row is created for your user.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-mca-md" aria-labelledby="compare-tiers-heading">
        <TierCompareMount currentSlug={currentSlug} />
        <h2
          id="compare-tiers-heading"
          className="text-sm font-semibold uppercase tracking-wide text-mca-ink-subtle"
        >
          Compare everything
        </h2>
        <p className="max-w-2xl text-sm text-mca-ink-muted">
          Scan tools, limits, and profile perks at a glance. Numbers follow your{" "}
          <code className="rounded bg-mca-chrome/80 px-mca-micro py-mca-trace text-xs">tiers</code> catalog;
          your active caps may differ if your account was grandfathered.
        </p>
        <TierCompareFeatureTable rows={compareFeatureRows} currentSlug={currentSlug} />
      </section>

      <section
        className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/60 p-mca-lg dark:border-mca-border-subtle"
        aria-labelledby="benefits-heading"
      >
        <h2 id="benefits-heading" className="text-sm font-semibold text-mca-ink-strong">
          What you unlock next
        </h2>
        <ul className="mt-mca-sm list-inside list-disc space-y-mca-xs text-sm text-mca-ink-muted">
          <li>Higher binder and card caps for large collections.</li>
          <li>More monthly scans for camera-based intake.</li>
          <li>
            Pro adds batch capture, auto-crop, and auto-rotate; Elite and Business add priority queue when
            it&apos;s busy; Business adds CSV export for your collection.
          </li>
        </ul>
      </section>

      {user ? (
        <section
          id="billing"
          className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 p-mca-lg shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card dark:border-mca-border-subtle"
          aria-labelledby="billing-heading"
        >
          <h2 id="billing-heading" className="text-sm font-semibold text-mca-ink-strong">
            Billing
          </h2>
          <p className="mt-mca-sm text-sm leading-relaxed text-mca-ink-subtle">
            Subscribe to Pro, Elite, or Business with Stripe Checkout, or open the customer portal to
            change plans, update payment method, or cancel.
          </p>
          <div className="mt-mca-comfortable">
            <BillingActions
              currentTierSlug={tier?.tier_slug ?? "free"}
              hasStripeCustomer={hasStripeCustomer}
              billingEnabled={billingEnabled}
            />
          </div>
          <p className="mt-mca-md text-mca-caption text-mca-hint">
            Invoices &amp; receipts:{" "}
            <Link
              href="/billing/history"
              className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline"
            >
              Billing history
            </Link>
          </p>
        </section>
      ) : null}

      {tier && user && isDev ? (
        <section
          id="mock-tier-switcher"
          className="rounded-mca-block border border-mca-accent-strong/30 bg-mca-surface-elevated/80 p-mca-lg shadow-mca-panel transition-all duration-200 ease-mca-standard hover:shadow-mca-card"
          aria-labelledby="mock-tier-heading"
        >
          <h2 id="mock-tier-heading" className="text-sm font-semibold text-mca-ink-strong">
            Mock tier switcher (development only)
          </h2>
          <p className="mt-mca-sm text-sm leading-relaxed text-mca-ink-subtle">
            These buttons call the database RPC{" "}
            <code className="rounded bg-mca-chrome/80 px-mca-micro py-mca-trace text-xs text-mca-ink-body">
              mock_upgrade_user_tier(tier_slug)
            </code>{" "}
            with <span className="text-mca-ink-muted">free</span>,{" "}
            <span className="text-mca-ink-muted">pro</span>,{" "}
            <span className="text-mca-ink-muted">elite</span>, or{" "}
            <span className="text-mca-ink-muted">business</span>. There is no payment—use only for local
            testing.
          </p>
          <p className="mt-mca-compact text-xs text-mca-nav-accent/70">
            Hidden in production (
            <code className="rounded bg-mca-chrome px-mca-xs text-[0.65rem]">NODE_ENV=production</code>).
          </p>
          <div className="mt-mca-comfortable">
            <TierUpgradeButtons tiers={[...MOCK_TIER_OPTIONS]} currentSlug={tier.tier_slug} />
          </div>
        </section>
      ) : null}

      <section className="space-y-mca-base" aria-labelledby="tier-links-heading">
        <h2
          id="tier-links-heading"
          className="text-sm font-semibold uppercase tracking-wide text-mca-ink-subtle"
        >
          Quick links
        </h2>
        <div className="mt-mca-compact flex flex-wrap gap-mca-compact">
          <Link
            href="/binders"
            className="inline-flex items-center rounded-mca-control border border-mca-border-subtle bg-mca-surface-elevated/80 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-chrome/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97]"
          >
            Your binders
          </Link>
          <Link
            href="/scan"
            className="inline-flex items-center rounded-mca-control border border-mca-border-subtle bg-mca-surface-elevated/80 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-chrome/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97]"
          >
            Scan a card
          </Link>
        </div>
      </section>
    </div>
  );
}
