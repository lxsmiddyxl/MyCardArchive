import { BillingActions } from "@/components/billing-actions";
import { NavBackLink } from "@/mca-ui";
import { isCurrentUserInternalUnlimited } from "@/lib/entitlements/internal-unlimited";
import { authSignInUrl } from "@/lib/auth/safe-next-path";
import { isStripeConfigured } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Billing history",
};

function isBillingConfigured(): boolean {
  return (
    isStripeConfigured() &&
    Boolean(process.env.STRIPE_PRICE_PRO?.trim()) &&
    Boolean(process.env.STRIPE_PRICE_ELITE?.trim())
  );
}

export default async function BillingHistoryPage() {
  const supabase = createClient();
  let user: { id: string } | null = null;
  try {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    user = u;
  } catch {
    redirect(authSignInUrl("/billing/history"));
  }

  if (!user) {
    redirect(authSignInUrl("/billing/history"));
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
      <NavBackLink href="/billing">← Billing</NavBackLink>
      <header className="space-y-mca-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Billing
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-mca-ink-strong">
          Invoices &amp; receipts
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">
          MyCardArchive does not store full invoice PDFs. Stripe hosts your payment history, receipts,
          and tax documents—open the customer portal to view or download them.
        </p>
      </header>

      <section
        className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/80 p-mca-lg shadow-mca-panel dark:border-mca-border-subtle"
        aria-labelledby="portal-actions-heading"
      >
        <h2 id="portal-actions-heading" className="text-sm font-semibold text-mca-ink-strong">
          Open Stripe
        </h2>
        <p className="mt-mca-sm text-sm text-mca-ink-subtle">
          {hasStripeCustomer
            ? "Use Manage billing to reach your Stripe customer portal."
            : "After you subscribe once, the portal opens here for invoices and card updates."}
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

      <p className="text-mca-caption text-mca-hint">
        Questions about a charge?{" "}
        <Link
          href="/support"
          className="font-medium text-mca-accent-strong/90 underline-offset-2 hover:underline"
        >
          Report an issue
        </Link>{" "}
        with your receipt date and last four digits of the card.
      </p>
    </div>
  );
}
