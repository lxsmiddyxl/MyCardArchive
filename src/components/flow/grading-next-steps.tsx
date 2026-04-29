"use client";

import { Panel } from "@/mca-ui/panel";
import Link from "next/link";

type Props = {
  binderId: string;
  cardId: string;
  /** When true, skip binder-specific links. */
  readOnly?: boolean;
  /** Grading ran at least once successfully. */
  hasGrading: boolean;
};

/**
 * Post–grading “what next” strip: binder context → scan again.
 */
export function GradingNextSteps({ binderId, cardId, readOnly, hasGrading }: Props) {
  if (readOnly || !hasGrading) return null;

  return (
    <Panel className="border border-mca-focus/25 bg-mca-success-bold/5 lg:col-span-2">
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
        Next steps
      </p>
      <ul className="mt-mca-sm list-inside list-disc space-y-mca-xs text-mca-body text-mca-ink-muted">
        <li>
          <Link
            href={`/binders/${encodeURIComponent(binderId)}`}
            className="font-medium text-mca-accent-strong/90 underline-offset-2 transition-colors duration-200 ease-mca-standard hover:underline"
          >
            View this card in your binder
          </Link>{" "}
          to move slots or open it from the shelf.
        </li>
        <li>
          <Link
            href="/scan"
            className="font-medium text-mca-accent-strong/90 underline-offset-2 transition-colors duration-200 ease-mca-standard hover:underline"
          >
            Scan another card
          </Link>{" "}
          to add more from photos.
        </li>
        <li className="text-mca-caption text-mca-hint">
          Card id: <span className="font-mono text-mca-ink-subtle">{cardId}</span>
        </li>
      </ul>
    </Panel>
  );
}
