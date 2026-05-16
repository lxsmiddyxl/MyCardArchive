"use client";

import { Icon } from "@/mca-ui/icon";
import { McaIcons } from "@/lib/icons/mca-icons";
import { cn } from "@/lib/ui/cn";
import { useCallback, useEffect } from "react";

export type BinderPageNavigationProps = {
  page: number;
  maxPages: number;
  storedPageNumbers: number[];
  busy?: boolean;
  onPageChange: (page: number) => void;
  className?: string;
};

export function BinderPageNavigation({
  page,
  maxPages,
  storedPageNumbers,
  busy,
  onPageChange,
  className,
}: BinderPageNavigationProps) {
  const canGoPrev = page > 0;
  const canGoNext = page < maxPages - 1;

  const goPrev = useCallback(() => {
    if (!canGoPrev || busy) return;
    onPageChange(page - 1);
  }, [busy, canGoPrev, onPageChange, page]);

  const goNext = useCallback(() => {
    if (!canGoNext || busy) return;
    onPageChange(page + 1);
  }, [busy, canGoNext, onPageChange, page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (busy) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (/^[1-9]$/.test(e.key)) {
        const jump = Number(e.key) - 1;
        if (jump < maxPages) {
          e.preventDefault();
          onPageChange(jump);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, goNext, goPrev, maxPages, onPageChange]);

  const jumpOptions = Array.from({ length: maxPages }, (_, i) => i);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-mca-compact rounded-mca-card border border-mca-border bg-mca-surface-elevated/90 px-mca-base py-mca-compact shadow-mca-panel",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-mca-sm">
        <button
          type="button"
          disabled={!canGoPrev || busy}
          onClick={goPrev}
          className="inline-flex items-center gap-mca-micro rounded-mca-block border border-mca-border-subtle bg-mca-surface/80 px-mca-compact py-mca-sm text-sm font-medium text-mca-ink-soft transition duration-200 ease-mca-standard hover:bg-mca-chrome/80 disabled:opacity-40"
        >
          <Icon src={McaIcons.collection.arrowLeft} size="md" alt="" />
          Prev
        </button>
        <button
          type="button"
          disabled={!canGoNext || busy}
          onClick={goNext}
          className="inline-flex items-center gap-mca-micro rounded-mca-block border border-mca-border-subtle bg-mca-surface/80 px-mca-compact py-mca-sm text-sm font-medium text-mca-ink-soft transition duration-200 ease-mca-standard hover:bg-mca-chrome/80 disabled:opacity-40"
        >
          Next
          <Icon src={McaIcons.collection.arrowRight} size="md" alt="" />
        </button>
      </div>

      <p className="text-sm text-mca-ink-muted">
        Page{" "}
        <span className="font-semibold tabular-nums text-mca-ink-strong">{page + 1}</span>
        <span className="text-mca-hint"> / </span>
        <span className="tabular-nums">{maxPages}</span>
        {storedPageNumbers.length > 0 ? (
          <span className="ml-mca-sm text-mca-caption text-mca-ink-subtle">
            ({storedPageNumbers.length} stored)
          </span>
        ) : null}
      </p>

      <label className="flex items-center gap-mca-sm text-xs text-mca-ink-muted">
        Jump to
        <select
          value={page}
          disabled={busy}
          onChange={(e) => onPageChange(Number(e.target.value))}
          className="rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-tight text-sm text-mca-ink-body"
        >
          {jumpOptions.map((p) => (
            <option key={p} value={p}>
              Page {p + 1}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
