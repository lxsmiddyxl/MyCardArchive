"use client";

import type { ScanPackOffer } from "@/components/billing/scan-pack-purchase-panel";
import { ScanPackPurchasePanel } from "@/components/billing/scan-pack-purchase-panel";
import { ModalBase } from "@/mca-ui/modal-base";
import Link from "next/link";

export function ScanPackLimitModal({
  isOpen,
  onClose,
  packs,
  billingEnabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  packs: ScanPackOffer[];
  billingEnabled: boolean;
}) {
  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="You're out of scans for this month"
      panelClassName="max-w-lg"
      footer={
        <div className="flex w-full flex-wrap justify-end gap-mca-sm">
          <button
            type="button"
            onClick={onClose}
            className="rounded-mca-control border border-mca-border bg-mca-surface-elevated/80 px-mca-md py-mca-sm text-sm font-medium text-mca-ink-muted transition hover:bg-mca-chrome/50"
          >
            Close
          </button>
          <Link
            href="/tier#billing"
            className="inline-flex items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome/70 px-mca-md py-mca-sm text-sm font-semibold text-mca-ink-strong transition hover:bg-mca-border-subtle/60"
          >
            Upgrade plan
          </Link>
        </div>
      }
    >
      <div className="space-y-mca-lg px-mca-lg py-mca-md">
        <p className="text-sm leading-relaxed text-mca-ink-muted">
          Your monthly plan allowance and any bonus balance are fully used up. Pick a higher plan for a larger monthly
          pool, or grab a one-time scan pack to keep going right away.
        </p>
        <ScanPackPurchasePanel
          packs={packs}
          billingEnabled={billingEnabled}
          title="Buy a scan pack"
          subtitle="Bonus scans apply after your plan’s monthly allowance is used up."
          compact
        />
      </div>
    </ModalBase>
  );
}
