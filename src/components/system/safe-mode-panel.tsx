"use client";

import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import Link from "next/link";

type Props = {
  title?: string;
  surfaceLabel: string;
  onRetry: () => void;
  onDismiss?: () => void;
};

/**
 * Shown when a surface exhausts retries — limited functionality, clear recovery actions.
 */
export function SafeModePanel({
  title = "Safe mode",
  surfaceLabel,
  onRetry,
  onDismiss,
}: Props) {
  return (
    <Panel
      elevated
      className="border border-mca-accent-strong/35 bg-mca-warning-surface/20 p-mca-lg shadow-mca-card transition-[box-shadow,opacity] duration-200 ease-mca-standard"
    >
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-warning-tint">
        {title}
      </p>
      <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
        <span className="font-medium text-mca-ink-body">{surfaceLabel}</span> couldn&apos;t load after
        several tries. You can retry, go home, or keep browsing—other areas of the app still work.
      </p>
      <div className="mt-mca-lg flex flex-wrap gap-mca-sm">
        <Button type="button" variant="primary" onClick={onRetry}>
          Try again
        </Button>
        {onDismiss ? (
          <Button type="button" variant="secondary" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
        <Link
          href="/feed"
          className="inline-flex items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong transition-all duration-200 ease-mca-standard hover:bg-mca-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98]"
        >
          Feed
        </Link>
      </div>
    </Panel>
  );
}
