"use client";

import type { ScanPackId } from "@/lib/billing/scan-packs-config";
import { postStripeCheckout } from "@/lib/billing/stripe-checkout-client";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { Button, ModalBase } from "@/mca-ui";
import Link from "next/link";
import { useState } from "react";

const TEL = { componentName: "ScanPackPurchasePanel", surfaceName: "billing" } as const;

export type ScanPackOffer = {
  id: ScanPackId;
  label: string;
  blurb: string;
  bonusScans: number;
  priceLabel: string;
};

export function ScanPackPurchasePanel({
  packs,
  billingEnabled,
  title = "Running low on scans?",
  subtitle = "Top up with a scan pack. Bonus scans are used after your plan’s monthly pool.",
  compact = false,
}: {
  packs: ScanPackOffer[];
  billingEnabled: boolean;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const [confirmPack, setConfirmPack] = useState<ScanPackId | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const pending = packs.find((p) => p.id === confirmPack);

  async function checkout() {
    if (!confirmPack) return;
    setLoading(true);
    setMessage(null);
    mcaLog.event("scan_pack.checkout.start", { pack: confirmPack }, TEL);
    const result = await postStripeCheckout({ kind: "scan_pack", packId: confirmPack });
    setLoading(false);
    if (result.ok) {
      window.location.href = result.url;
      return;
    }
    setMessage(result.error);
    mcaLog.warn("scan_pack.checkout.fail", { pack: confirmPack }, TEL);
  }

  return (
    <div className="space-y-mca-md">
      <ModalBase
        isOpen={confirmPack !== null}
        onClose={() => setConfirmPack(null)}
        title={pending ? `Buy ${pending.label}?` : "Confirm purchase"}
        panelClassName="max-w-md"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmPack(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={loading || !confirmPack}
              onClick={() => void checkout()}
            >
              {loading ? "Redirecting…" : "Continue to checkout"}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-mca-ink-muted">
          You&apos;ll complete a one-time payment on Stripe. Bonus scans are added after checkout (usually within a
          minute).
        </p>
        {pending ? (
          <p className="mt-mca-sm text-sm font-medium text-mca-ink-body">
            {pending.blurb} · {pending.priceLabel}
          </p>
        ) : null}
      </ModalBase>

      {message ? (
        <p className="text-sm text-mca-accent-border dark:text-mca-accent" role="status">
          {message}
        </p>
      ) : null}

      <div className={compact ? "space-y-mca-sm" : "space-y-mca-compact"}>
        <h3
          className={
            compact
              ? "text-base font-semibold text-mca-ink-strong"
              : "text-sm font-semibold uppercase tracking-wide text-mca-ink-subtle"
          }
        >
          {title}
        </h3>
        <p className="max-w-2xl text-sm leading-relaxed text-mca-ink-muted">{subtitle}</p>
      </div>

      {!billingEnabled ? (
        <p className="text-sm text-mca-ink-subtle">
          Stripe billing isn&apos;t configured on this deployment — scan packs can&apos;t be purchased here. You can
          still{" "}
          <Link href="/tier#billing" className="font-medium text-mca-accent underline-offset-2 hover:underline">
            open Plans
          </Link>{" "}
          for mock tier tools in development.
        </p>
      ) : (
        <ul
          className={
            compact
              ? "grid gap-mca-sm sm:grid-cols-3"
              : "grid gap-mca-md sm:grid-cols-3"
          }
        >
          {packs.map((p) => (
            <li
              key={p.id}
              className="flex flex-col rounded-mca-block border border-mca-border bg-mca-surface-elevated/50 p-mca-md dark:border-mca-border-subtle"
            >
              <p className="text-sm font-semibold text-mca-ink-strong">{p.label}</p>
              <p className="mt-mca-xs text-xs text-mca-ink-muted">{p.blurb}</p>
              <p className="mt-mca-sm text-lg font-bold tabular-nums text-mca-ink-strong">{p.priceLabel}</p>
              <p className="mt-mca-xs text-mca-caption text-mca-ink-subtle">one-time</p>
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmPack(p.id)}
                className="mt-mca-md inline-flex w-full items-center justify-center rounded-mca-control border border-mca-accent-strong/45 bg-mca-accent-border/15 px-mca-base py-mca-sm text-sm font-semibold text-mca-warning-tint transition hover:bg-mca-accent-border/25 disabled:opacity-50"
              >
                Buy pack
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
