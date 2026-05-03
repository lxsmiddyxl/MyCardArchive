"use client";

import { Button, ModalBase } from "@/mca-ui";
import type { PaidTierSlug } from "@/lib/billing/price-to-tier";
import { postStripeCheckout } from "@/lib/billing/stripe-checkout-client";
import { fetchWithRetry } from "@/lib/http/fetch-with-retry";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useState } from "react";

const TEL = { componentName: "BillingActions", surfaceName: "tier" } as const;

type Props = {
  currentTierSlug: string;
  hasStripeCustomer: boolean;
  billingEnabled: boolean;
  /** Internal unlimited — hide checkout / upgrade; optional portal for legacy subscriptions. */
  suppressCommercialUi?: boolean;
};

function tierLabel(t: PaidTierSlug): string {
  return t === "pro" ? "Pro" : t === "elite" ? "Elite" : "Business";
}

export function BillingActions({
  currentTierSlug,
  hasStripeCustomer,
  billingEnabled,
  suppressCommercialUi = false,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmTier, setConfirmTier] = useState<PaidTierSlug | null>(null);
  const [confirmPortal, setConfirmPortal] = useState(false);

  async function startCheckout(tier: PaidTierSlug) {
    setConfirmTier(null);
    setLoading(`checkout-${tier}`);
    setMessage(null);
    mcaLog.event("tier.checkout.start", { tier }, TEL);
    try {
      const result = await postStripeCheckout({ kind: "subscription", tier });
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      setMessage(result.error);
      mcaLog.warn("tier.checkout.fail", { tier }, TEL);
    } finally {
      setLoading(null);
    }
  }

  async function openPortal() {
    setConfirmPortal(false);
    setLoading("portal");
    setMessage(null);
    mcaLog.event("tier.portal.start", {}, TEL);
    try {
      const res = await fetchWithRetry("/api/billing/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        setMessage(data.error ?? `Portal failed (${res.status})`);
        mcaLog.warn("tier.portal.fail", { status: res.status }, TEL);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage("No portal URL returned");
    } finally {
      setLoading(null);
    }
  }

  const slug = currentTierSlug.toLowerCase();
  const showPro = slug === "free";
  const showElite = slug === "free" || slug === "pro";
  const showBusiness = slug === "free" || slug === "pro" || slug === "elite";

  if (!billingEnabled) {
    return (
      <p className="text-sm text-mca-ink-subtle">
        Stripe billing is not configured on this deployment (
        <code className="rounded bg-mca-chrome/80 px-mca-xs text-xs">
          STRIPE_SECRET_KEY
        </code>
        , price IDs, etc.).
      </p>
    );
  }

  if (suppressCommercialUi) {
    return (
      <div className="space-y-mca-sm">
        <p className="text-sm text-mca-ink-muted">
          Full platform access is enabled for your account. Paid upgrades and scan packs are hidden here.
        </p>
        {hasStripeCustomer ? (
          <>
            <ModalBase
              isOpen={confirmPortal}
              onClose={() => setConfirmPortal(false)}
              title="Open billing portal?"
              panelClassName="max-w-md"
            >
              <p className="text-sm leading-relaxed text-mca-ink-muted">
                Stripe hosts invoices, payment methods, plan changes, and cancellation.
              </p>
              <div className="mt-mca-lg flex flex-wrap justify-end gap-mca-sm">
                <Button type="button" variant="secondary" onClick={() => setConfirmPortal(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={loading !== null}
                  onClick={() => void openPortal()}
                >
                  {loading === "portal" ? "Opening…" : "Open portal"}
                </Button>
              </div>
            </ModalBase>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => setConfirmPortal(true)}
              className="rounded-mca-control border border-mca-field-border bg-mca-chrome/80 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:border-mca-border-interactive hover:bg-mca-chrome/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Manage billing
            </button>
          </>
        ) : null}
      </div>
    );
  }

  const tierLabelText = confirmTier ? tierLabel(confirmTier) : "";

  return (
    <div className="space-y-mca-base">
      <ModalBase
        isOpen={confirmTier !== null}
        onClose={() => setConfirmTier(null)}
        title={confirmTier ? `Continue to ${tierLabelText}?` : "Confirm"}
        panelClassName="max-w-md"
      >
        <p className="text-sm leading-relaxed text-mca-ink-muted">
          You&apos;ll leave MyCardArchive to complete checkout on Stripe. Your plan limits update after
          the subscription webhook runs.
        </p>
        <div className="mt-mca-lg flex flex-wrap justify-end gap-mca-sm">
          <Button type="button" variant="secondary" onClick={() => setConfirmTier(null)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={loading !== null || !confirmTier}
            onClick={() => confirmTier && void startCheckout(confirmTier)}
          >
            {loading && confirmTier ? "Redirecting…" : "Continue to checkout"}
          </Button>
        </div>
      </ModalBase>

      <ModalBase
        isOpen={confirmPortal}
        onClose={() => setConfirmPortal(false)}
        title="Open billing portal?"
        panelClassName="max-w-md"
      >
        <p className="text-sm leading-relaxed text-mca-ink-muted">
          Stripe hosts invoices, payment methods, plan changes, and cancellation. You can download
          receipts there.
        </p>
        <div className="mt-mca-lg flex flex-wrap justify-end gap-mca-sm">
          <Button type="button" variant="secondary" onClick={() => setConfirmPortal(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={loading !== null}
            onClick={() => void openPortal()}
          >
            {loading === "portal" ? "Opening…" : "Open portal"}
          </Button>
        </div>
      </ModalBase>

      {message ? (
        <p className="text-sm text-mca-accent-border dark:text-mca-accent" role="status">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-mca-sm">
        {showPro ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => setConfirmTier("pro")}
            className="rounded-mca-control border border-mca-accent-strong/50 bg-mca-accent-border/20 px-mca-base py-mca-sm text-sm font-semibold text-mca-warning-tint transition-all duration-200 ease-mca-standard hover:bg-mca-accent-border/30 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upgrade to Pro
          </button>
        ) : null}
        {showElite ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => setConfirmTier("elite")}
            className="rounded-mca-control border border-mca-violet-border/50 bg-mca-violet-surface/20 px-mca-base py-mca-sm text-sm font-semibold text-mca-violet-text transition-all duration-200 ease-mca-standard hover:bg-mca-violet-surface/30 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upgrade to Elite
          </button>
        ) : null}
        {showBusiness ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => setConfirmTier("business")}
            className="rounded-mca-control border border-mca-violet-border/50 bg-mca-violet-surface/20 px-mca-base py-mca-sm text-sm font-semibold text-mca-violet-text transition-all duration-200 ease-mca-standard hover:bg-mca-violet-surface/30 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Upgrade to Business
          </button>
        ) : null}
        {hasStripeCustomer ? (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => setConfirmPortal(true)}
            className="rounded-mca-control border border-mca-field-border bg-mca-chrome/80 px-mca-base py-mca-sm text-sm font-medium text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:border-mca-border-interactive hover:bg-mca-chrome/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Manage billing
          </button>
        ) : null}
      </div>
      <p className="text-xs text-mca-ink-subtle">
        Secure checkout via Stripe. After subscribing, your plan and limits
        update automatically (webhook). Use the billing portal to change or cancel a paid plan.
      </p>
    </div>
  );
}
