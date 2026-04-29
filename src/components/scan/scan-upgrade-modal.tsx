"use client";

import { ModalBase } from "@/mca-ui/modal-base";
import Link from "next/link";

export type ScanUpgradeReason =
  | "batch"
  | "auto_crop"
  | "auto_rotate"
  | "multi_scan"
  | "queue_priority"
  | "rerun"
  | "multi_drop"
  | "generic";

/**
 * When POST /api/scan returns 403, map the error body to a modal reason.
 * Returns null for scan-count limits and other non–feature-gate errors.
 */
export function parseScanTierFeatureBlockError(
  status: number,
  errorMessage: string,
  opts?: { responseCode?: string }
): ScanUpgradeReason | null {
  if (opts?.responseCode === "SCAN_LIMIT_EXHAUSTED") return null;
  if (status !== 403) return null;
  const e = errorMessage.toLowerCase();
  if (e.includes("used all scans for this month")) return null;
  if (
    e.includes("monthly scan limit") ||
    e.includes("try again next month") ||
    e.includes("reached your")
  ) {
    return null;
  }
  if (e.includes("send one image per scan request")) return null;
  if (e.includes("auto-crop")) return "auto_crop";
  if (e.includes("auto-rotate")) return "auto_rotate";
  if (e.includes("multi-scan")) return "multi_scan";
  if (e.includes("batch scanning")) return "batch";
  if (e.includes("free tier") && e.includes("one image per scan")) return "batch";
  if (e.includes("priority scanning")) return "queue_priority";
  if (e.includes("re-scan") || e.includes("shortcut")) return "rerun";
  if (e.includes("automated scan intake")) return "generic";
  if (e.includes("pro feature") || e.includes("elite feature")) return "generic";
  return null;
}

const COPY: Record<
  ScanUpgradeReason,
  { title: string; body: string; eliteNote?: boolean }
> = {
  batch: {
    title: "Batch scanning is a Pro feature",
    body: "Free tier is limited to one photo at a time so casual collectors stay fast while we prevent abuse. Pro unlocks batch-friendly uploads and tools. Elite members get unlimited batch scanning alongside the highest monthly scan allowances.",
  },
  auto_crop: {
    title: "Auto-crop is a Pro feature",
    body: "Upgrade to Pro or Elite to let the scanner trim card frames automatically after upload.",
  },
  auto_rotate: {
    title: "Auto-rotate is a Pro feature",
    body: "Upgrade to Pro or Elite to straighten photos automatically before recognition.",
  },
  multi_scan: {
    title: "Multi-scan mode is a Pro feature",
    body: "Upgrade on the Tier page to run richer scan sessions beyond single-card manual capture.",
  },
  queue_priority: {
    title: "Priority scanning is an Elite or Business feature",
    body: "Elite and Business members get the highest priority when scan traffic is busy. Upgrade on /tier to unlock it.",
    eliteNote: true,
  },
  rerun: {
    title: "Re-scan shortcuts require Pro",
    body: "Skipping manual upload with a saved scan is not available on the Free tier. Upgrade on /tier.",
  },
  multi_drop: {
    title: "One photo at a time on Free",
    body: "Drop a single card image, or upgrade to Pro for batch-friendly uploads and tools.",
  },
  generic: {
    title: "Unlock more on Pro or Elite",
    body: "This scan option is not included on the Free tier. See plans and limits on the Tier page.",
  },
};

export function ScanUpgradeModal({
  reason,
  isOpen,
  onClose,
}: {
  reason: ScanUpgradeReason | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const r = reason ?? "generic";
  const { title, body, eliteNote } = COPY[r] ?? COPY.generic;

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      panelClassName="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-mca-control border border-mca-border bg-mca-surface/80 px-mca-md py-mca-sm text-sm font-medium text-mca-ink-body transition hover:bg-mca-chrome/50"
          >
            Not now
          </button>
          <Link
            href="/tier"
            className="inline-flex items-center justify-center rounded-mca-control bg-mca-accent-strong/90 px-mca-md py-mca-sm text-sm font-semibold text-white shadow-mca-panel transition hover:bg-mca-accent"
          >
            View plans
          </Link>
        </>
      }
    >
      <div className="space-y-mca-md px-mca-lg py-mca-md">
        <p className="text-sm leading-relaxed text-mca-ink-muted">{body}</p>
        {eliteNote ? (
          <p className="text-xs text-mca-ink-subtle">
            Elite members get the highest limits and priority options alongside batch-friendly scanning.
          </p>
        ) : null}
      </div>
    </ModalBase>
  );
}
