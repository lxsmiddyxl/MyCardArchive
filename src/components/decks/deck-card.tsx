"use client";

import Link from "next/link";
import { memo } from "react";

export type DeckCardProps = {
  id: string;
  name: string;
  format: string;
  total_cards: number;
  synergy_score: number | null;
  legality_status: string;
  /** Relative label, e.g. from formatRelativeTime(iso) */
  createdAtLabel: string;
  onRename: (deckId: string) => void;
  onDelete: (deckId: string) => void;
};

function formatLabel(slug: string): string {
  const s = slug.trim().toLowerCase();
  const map: Record<string, string> = {
    standard: "Standard",
    expanded: "Expanded",
    unlimited: "Unlimited",
    modern: "Expanded",
    commander: "Brawl",
    custom: "Custom",
  };
  return map[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
}

function DeckCardInner({
  id,
  name,
  format: formatSlug,
  total_cards,
  synergy_score,
  legality_status,
  createdAtLabel,
  onRename,
  onDelete,
}: DeckCardProps) {
  const synergy =
    typeof synergy_score === "number" && Number.isFinite(synergy_score)
      ? Math.min(100, Math.max(0, synergy_score))
      : null;

  return (
    <article
      className="group relative overflow-hidden rounded-mca-sheet border border-mca-border bg-mca-surface-elevated/40 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition-all duration-200 ease-mca-standard hover:-translate-y-0.5 hover:border-mca-accent-strong/35 hover:bg-mca-surface-elevated/65 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)]"
    >
      <Link
        href={`/decks/${id}`}
        className="block p-mca-lg pb-mca-comfortable outline-none focus-visible:ring-2 focus-visible:ring-mca-accent-strong/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface"
      >
        <div className="flex flex-wrap items-start gap-mca-sm pe-20">
          <span className="inline-flex rounded-mca-block border border-mca-accent-strong/25 bg-mca-accent-strong/10 px-mca-sm py-mca-trace text-xs font-medium text-mca-nav-accent/95">
            {formatLabel(formatSlug)}
          </span>
          <span className="inline-flex rounded-mca-block border border-mca-field-border/80 bg-mca-chrome/60 px-mca-sm py-mca-trace text-xs font-medium capitalize text-mca-ink-body">
            {legality_status || "—"}
          </span>
        </div>

        <h2 className="mt-mca-base text-lg font-semibold tracking-tight text-mca-ink-strong transition group-hover:text-white">
          {name}
        </h2>

        <p className="mt-mca-compact text-sm text-mca-ink-muted">
          <span className="tabular-nums font-semibold text-mca-ink-soft">
            {total_cards}
          </span>{" "}
          {total_cards === 1 ? "card" : "cards"}
        </p>

        {synergy != null ? (
          <div className="mt-mca-base">
            <div className="flex items-center justify-between text-xs text-mca-ink-subtle">
              <span>Synergy</span>
              <span className="tabular-nums text-mca-ink-muted">{synergy}%</span>
            </div>
            <div
              className="mt-mca-micro h-1.5 overflow-hidden rounded-full bg-mca-chrome"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={synergy}
              aria-label={`Synergy ${synergy} percent`}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-mca-accent-deep/90 to-mca-accent/90 transition-[width] duration-300"
                style={{ width: `${synergy}%` }}
              />
            </div>
          </div>
        ) : (
          <p className="mt-mca-base text-xs text-mca-ink-subtle">Synergy not calculated</p>
        )}

        <p className="mt-mca-comfortable text-xs text-mca-ink-subtle">
          Created{" "}
          <span className="font-medium text-mca-ink-muted">{createdAtLabel}</span>
        </p>
      </Link>

      <div className="absolute right-3 top-3 z-10 flex gap-mca-xs">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRename(id);
          }}
          className="rounded-mca-block border border-mca-border-subtle bg-mca-surface-elevated/90 p-mca-sm text-mca-ink-muted shadow-mca-panel backdrop-blur-sm transition hover:border-mca-border-interactive hover:bg-mca-chrome hover:text-mca-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mca-accent-strong"
          aria-label={`Rename ${name}`}
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(id);
          }}
          className="rounded-mca-block border border-mca-border-subtle bg-mca-surface-elevated/90 p-mca-sm text-mca-ink-muted shadow-mca-panel backdrop-blur-sm transition hover:border-red-900/60 hover:bg-red-950/40 hover:text-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-500"
          aria-label={`Delete ${name}`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export const DeckCard = memo(DeckCardInner);

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}
