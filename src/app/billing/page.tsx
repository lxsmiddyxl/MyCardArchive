import { BillingActions } from "@/components/billing-actions";
import { NavBackLink } from "@/mca-ui";
import { isCurrentUserInternalUnlimited } from "@/lib/entitlements/internal-unlimited";
import { isStripeConfigured } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Billing",
};

function isBillingConfigured(): boolean {
  return (
    isStripeConfigured() &&
    Boolean(process.env.STRIPE_PRICE_PRO?.trim()) &&
    Boolean(process.env.STRIPE_PRICE_ELITE?.trim())
  );
}

export default async function BillingPage() {
  const supabase = createClient();
  let user: { id: string } | null = null;
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch {
    redirect("/login?next=/billing");
  }

  if (!user) {
    redirect("/login?next=/billing");
  }

  const suppressCommercialUi = await isCurrentUserInternalUnlimited(supabase);

  const { data: cust } = await supabase
    .from("stripe_customers")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const hasStripeCustomer = Boolean(cust);

  const { data: tierRow } = await supabase
    .from("user_tiers")
    .select("tier_slug")
    .eq("user_id", user.id)
    .maybeSingle();

  const billingEnabled = isBillingConfigured();

  return (
    <div className="space-y-mca-xl pt-mca-sm">
      <NavBackLink href="/tier">← Plans &amp; pricing</NavBackLink>

      <header className="space-y-mca-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Billing
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-mca-ink-strong">
          Subscription &amp; payment method
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
          Manage your plan through Stripe Checkout or the customer portal—cancel, resume, update your card,
          and download receipts.
        </p>
      </header>

      <section
        className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 p-mca-lg shadow-mca-panel dark:border-mca-border-subtle"
        aria-labelledby="billing-actions-heading"
      >
        <h2 id="billing-actions-heading" className="text-sm font-semibold text-mca-ink-strong">
          Actions
        </h2>
        <p className="mt-mca-sm text-sm text-mca-ink-subtle">
          Current catalog tier:{" "}
          <span className="font-mono text-mca-ink-muted">{tierRow?.tier_slug ?? "free"}</span>
          {hasStripeCustomer ? (
            <span className="text-mca-hint"> · Stripe customer on file</span>
          ) : (
            <span className="text-mca-hint"> · No Stripe customer yet</span>
          )}
        </p>
        <div className="mt-mca-comfortable">
          <BillingActions
            currentTierSlug={tierRow?.tier_slug ?? "free"}
            hasStripeCustomer={hasStripeCustomer}
            billingEnabled={billingEnabled}
            suppressCommercialUi={suppressCommercialUi}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-mca-compact text-sm">
        <Link
          href="/billing/history"
          className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline"
        >
          Invoices &amp; receipts
        </Link>
        <span className="text-mca-hint" aria-hidden>
          ·
        </span>
        <Link href="/tier" className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline">
          Compare plans &amp; usage
        </Link>
      </div>
    </div>
  );
}
