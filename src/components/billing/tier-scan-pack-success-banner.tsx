"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Shows a short confirmation after returning from Stripe scan-pack checkout.
 */
export function TierScanPackSuccessBanner() {
  const search = useSearchParams();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  const billing = search.get("billing");
  const pack = search.get("pack");

  useEffect(() => {
    if (billing === "scan_pack_success") {
      setVisible(true);
    }
  }, [billing]);

  const dismiss = useCallback(() => {
    setVisible(false);
    const next = new URLSearchParams(search.toString());
    next.delete("billing");
    next.delete("pack");
    const q = next.toString();
    router.replace(q ? `/tier?${q}` : "/tier");
  }, [router, search]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="flex flex-col gap-mca-sm rounded-mca-block border border-mca-accent-strong/35 bg-mca-warning-surface/20 px-mca-comfortable py-mca-base text-sm text-mca-ink-body sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        <span className="font-semibold text-mca-ink-strong">Thanks!</span>{" "}
        {pack
          ? `Your ${pack} scan pack is processing — bonus scans usually appear within a minute after checkout.`
          : "Your scan pack is processing — bonus scans usually appear within a minute after checkout."}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-mca-control border border-mca-border bg-mca-surface-elevated/80 px-mca-base py-mca-sm text-xs font-medium text-mca-ink-muted hover:bg-mca-chrome/50"
      >
        Dismiss
      </button>
    </div>
  );
}
