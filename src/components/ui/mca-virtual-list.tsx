"use client";

import { mcaLog } from "@/lib/logging/mca-log-client";
import type { McaLogContext } from "@/lib/logging/types";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type McaVirtualListProps<T> = {
  items: readonly T[];
  /** Exposed to assistive tech when the list has a specific purpose (e.g. “Match results”). */
  ariaLabel?: string;
  /** Row height estimate in px (include vertical gap if rows are spaced). */
  estimateSize: number;
  overscan?: number;
  /** When true, rows are measured after mount (variable-height lists). */
  measureDynamic?: boolean;
  /**
   * Optional scroll container ref (scroll restoration, realtime prepend stability).
   * If omitted, an internal ref is used.
   */
  scrollRef?: MutableRefObject<HTMLDivElement | null>;
  className?: string;
  innerClassName?: string;
  getItemKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number, virtualRow: VirtualItem) => ReactNode;
  /** Optional: logs viewport slice + scroll timing (throttled, non-blocking). */
  telemetry?: { name: string; ctx: McaLogContext };
};

/**
 * Vertical virtual list with transform-only row positioning (no layout thrash from top margins).
 * Parent is the scroll container; give it a bounded height (e.g. flex-1 min-h-0 max-h-*).
 */
export function McaVirtualList<T>({
  items,
  ariaLabel,
  estimateSize,
  overscan = 8,
  measureDynamic = false,
  scrollRef: scrollRefProp,
  className,
  innerClassName,
  getItemKey,
  renderItem,
  telemetry,
}: McaVirtualListProps<T>) {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const setScrollRef = useCallback(
    (el: HTMLDivElement | null) => {
      internalRef.current = el;
      if (scrollRefProp) {
        scrollRefProp.current = el;
      }
    },
    [scrollRefProp]
  );

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => internalRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const scrollLogTimer = useRef<ReturnType<typeof setTimeout> | undefined>();
  const virtualizerRef = useRef(virtualizer);
  virtualizerRef.current = virtualizer;

  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  const telemetryKey = telemetry
    ? `${telemetry.name}:${telemetry.ctx.componentName}:${telemetry.ctx.surfaceName}:${telemetry.ctx.traceId ?? ""}`
    : "";

  useEffect(() => {
    const tel = telemetryRef.current;
    if (!tel) return;
    const el = internalRef.current;
    if (!el) return;

    const logViewport = () => {
      const t = telemetryRef.current;
      if (!t) return;
      const vis = virtualizerRef.current.getVirtualItems();
      const first = vis[0]?.index ?? -1;
      const last = vis[vis.length - 1]?.index ?? -1;
      queueMicrotask(() =>
        mcaLog.timing(
          `list.virtual.${t.name}.viewport`,
          {
            visible: vis.length,
            total: items.length,
            firstIndex: first,
            lastIndex: last,
          },
          t.ctx
        )
      );
    };

    const onScroll = () => {
      clearTimeout(scrollLogTimer.current);
      scrollLogTimer.current = setTimeout(logViewport, 400);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    queueMicrotask(logViewport);
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(scrollLogTimer.current);
    };
  }, [items.length, telemetryKey]);

  if (items.length === 0) return null;

  return (
    <div
      ref={setScrollRef}
      role="list"
      aria-label={ariaLabel}
      className={cn("overflow-y-auto overflow-x-hidden", className)}
    >
      <div
        className={cn("relative w-full", innerClassName)}
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          minHeight: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualizer.getVirtualItems().map((v) => {
          const item = items[v.index];
          if (item === undefined) return null;
          return (
            <div
              key={getItemKey(item, v.index)}
              data-index={v.index}
              ref={measureDynamic ? virtualizer.measureElement : undefined}
              className="absolute left-0 top-0 w-full [contain:layout]"
              style={{
                height: `${v.size}px`,
                transform: `translate3d(0, ${v.start}px, 0)`,
              }}
            >
              {renderItem(item, v.index, v)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
