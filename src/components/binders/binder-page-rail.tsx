"use client";

import { useMobileVirtualOverscan } from "@/lib/ui/use-mobile-virtual-overscan";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";

type Props = {
  binderId: string;
  /** Inclusive max page index (0-based), from tier limits. */
  pageCount: number;
  /** Stored pages that contain at least one row (for styling). */
  storedPageIndices: readonly number[];
  currentPage: number;
  busy: boolean;
  onSelectPage: (page: number) => void;
};

/**
 * Virtualized horizontal index for large binders (50–200+ logical pages).
 * Only renders visible page chips; scrolls to keep the active page in view.
 */
export const BinderPageRail = memo(function BinderPageRail({
  binderId,
  pageCount,
  storedPageIndices,
  currentPage,
  busy,
  onSelectPage,
}: Props) {
  const overscan = useMobileVirtualOverscan(8);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const storedSet = useMemo(() => new Set(storedPageIndices), [storedPageIndices]);

  const indices = useMemo(
    () => (pageCount > 0 ? Array.from({ length: pageCount }, (_, i) => i) : []),
    [pageCount]
  );

  const virtualizer = useVirtualizer({
    count: indices.length,
    horizontal: true,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan,
  });

  const scrollToPage = useCallback(
    (p: number) => {
      const i = indices.indexOf(p);
      if (i < 0) return;
      virtualizer.scrollToIndex(i, { align: "center" });
    },
    [indices, virtualizer]
  );

  useEffect(() => {
    scrollToPage(currentPage);
  }, [currentPage, scrollToPage]);

  if (indices.length === 0) return null;

  return (
    <div
      className="min-w-0 rounded-mca-block border border-mca-border-subtle bg-mca-surface/40 px-mca-micro py-mca-sm"
      data-binder-page-rail={binderId}
    >
      <p className="mb-mca-micro px-mca-micro text-[10px] font-medium uppercase tracking-wide text-mca-ink-subtle">
        Pages <span className="tabular-nums">({indices.length})</span>
      </p>
      <div
        ref={scrollRef}
        className="touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain"
        tabIndex={0}
      >
        <div
          className="relative h-9"
          style={{ width: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((vi) => {
            const pageIndex = indices[vi.index]!;
            const isActive = pageIndex === currentPage;
            const hasRows = storedSet.has(pageIndex);
            return (
              <div
                key={`${binderId}-pg-${pageIndex}`}
                className="absolute top-0 left-0 h-full"
                style={{
                  width: vi.size,
                  transform: `translateX(${vi.start}px)`,
                }}
              >
                <button
                  type="button"
                  disabled={busy}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={`Binder page ${pageIndex + 1}${hasRows ? "" : ", empty"}`}
                  onClick={() => onSelectPage(pageIndex)}
                  className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-mca-block border px-mca-sm text-xs font-semibold tabular-nums transition duration-200 ease-mca-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-40 ${
                    isActive
                      ? "border-mca-accent-deep/60 bg-mca-warning-surface/35 text-mca-nav-accent shadow-mca-panel"
                      : hasRows
                        ? "border-mca-border-subtle bg-mca-chrome/40 text-mca-ink-body hover:bg-mca-chrome/70"
                        : "border-mca-border-subtle/80 bg-mca-surface/50 text-mca-ink-muted hover:bg-mca-chrome/50"
                  }`}
                >
                  {pageIndex + 1}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
