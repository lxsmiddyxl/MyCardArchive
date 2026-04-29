"use client";

import Link from "next/link";
import { memo } from "react";

export type BinderShelfCardProps = {
  id: string;
  name: string;
  cardCount: number;
  createdLabel: string;
};

export const BinderShelfCard = memo(function BinderShelfCard({
  id,
  name,
  cardCount,
  createdLabel,
}: BinderShelfCardProps) {
  return (
    <li>
      <Link
        href={`/binders/${id}`}
        className="group flex h-full flex-col rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/40 p-mca-lg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition hover:border-mca-accent-strong/35 hover:bg-mca-surface-elevated/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mca-accent"
      >
        <h2 className="text-lg font-semibold tracking-tight text-mca-ink-strong group-hover:text-white">
          {name}
        </h2>
        <p className="mt-mca-compact text-sm text-mca-ink-muted">
          <span className="font-semibold tabular-nums text-mca-ink-soft">{cardCount}</span>{" "}
          {cardCount === 1 ? "card" : "cards"}
        </p>
        <p className="mt-auto pt-mca-base text-xs text-mca-ink-subtle">
          Created <span className="font-medium text-mca-ink-muted">{createdLabel}</span>
        </p>
      </Link>
    </li>
  );
});
