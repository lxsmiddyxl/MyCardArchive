"use client";

import { BinderGridRow } from "@/components/binders/binder-grid-row";
import { BINDER_GRID_COLS } from "@/lib/binders/constants";
import { cn } from "@/lib/ui/cn";
import type { BinderThemeClasses } from "@/mca-utils/binders/binder-theme";
import type { BinderPageSlotView } from "@/mca-utils/binders/binder-page-grid";
import { useMemo } from "react";

export type BinderPageViewProps = {
  binderId: string;
  page: number;
  slots: BinderPageSlotView[];
  busy: boolean;
  dragOver: { page: number; slot: number } | null;
  theme?: BinderThemeClasses;
  pageTurnClass?: string;
  shellRef?: React.RefObject<HTMLDivElement>;
  gridNavRef?: React.RefObject<HTMLDivElement>;
  activeSlotIndex: number;
  onGridKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onOpenSlot: (slot: BinderPageSlotView) => void;
  onOpenPicker: (page: number, slotIndex: number) => void;
  onMove: (from: { page: number; slot: number }, to: { page: number; slot: number }) => void;
  onDragOverSlot: (page: number, slot: number) => void;
  onDragLeaveSlot: (page: number, slot: number) => void;
  onClearDragOver: () => void;
  onActivateSlot: (slotIndex: number) => void;
};

export function BinderPageView({
  binderId,
  page,
  slots,
  busy,
  dragOver,
  theme,
  pageTurnClass,
  shellRef,
  gridNavRef,
  activeSlotIndex,
  onGridKeyDown,
  onOpenSlot,
  onOpenPicker,
  onMove,
  onDragOverSlot,
  onDragLeaveSlot,
  onClearDragOver,
  onActivateSlot,
}: BinderPageViewProps) {
  const slotRows = useMemo(() => {
    const rows: BinderPageSlotView[][] = [];
    for (let i = 0; i < slots.length; i += BINDER_GRID_COLS) {
      rows.push(slots.slice(i, i + BINDER_GRID_COLS));
    }
    return rows;
  }, [slots]);

  const activeDescendantId = `binder-${binderId}-p${page}-s${activeSlotIndex}`;

  return (
    <div
      ref={shellRef}
      className={cn(
        "binder-page-shell relative min-w-0 flex-1 overflow-hidden rounded-mca-card border p-mca-lg shadow-[6px_8px_28px_-6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]",
        theme?.shell,
        pageTurnClass
      )}
      style={theme?.style}
      aria-busy={busy}
    >
      {theme?.holoOverlay ? (
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-30 mix-blend-screen"
          aria-hidden
          style={{
            background:
              "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%)",
            animation: "mca-holo-shine 4s ease-in-out infinite",
          }}
        />
      ) : null}

      <div
        ref={gridNavRef}
        role="grid"
        aria-label="Binder page slots"
        tabIndex={0}
        aria-activedescendant={activeDescendantId}
        onKeyDown={onGridKeyDown}
        className="relative z-[2] grid gap-mca-md outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 focus-visible:ring-offset-2 focus-visible:ring-offset-mca-surface rounded-mca-block"
        style={{ gridTemplateColumns: `repeat(${BINDER_GRID_COLS}, minmax(0, 1fr))` }}
      >
        {slotRows.map((rowSlots, ri) => (
          <BinderGridRow
            key={`${binderId}-${page}-r-${ri}`}
            rowKey={`${binderId}-${page}-r-${ri}`}
            slots={rowSlots.map((slot) => ({
              page,
              slotIndex: slot.slotIndex,
              cardId: slot.cardId,
              card: slot.card,
              busy,
              isDragOver: dragOver?.page === page && dragOver?.slot === slot.slotIndex,
              gridCellId: `binder-${binderId}-p${page}-s${slot.slotIndex}`,
              isGridActive: activeSlotIndex === slot.slotIndex,
              onOpenDetail: () => {
                onActivateSlot(slot.slotIndex);
                onOpenSlot(slot);
              },
              onOpenPicker: (pn, si) => {
                onActivateSlot(si);
                onOpenPicker(pn, si);
              },
              onMove,
              onDragOverSlot,
              onDragLeaveSlot,
              onClearDragOver,
            }))}
          />
        ))}
      </div>

      <ul className="pointer-events-none absolute inset-0 z-[3] grid grid-cols-3 grid-rows-3 gap-mca-md p-mca-lg" aria-hidden>
        {slots.map((slot) => (
          <li
            key={slot.slotIndex}
            className="flex items-end justify-end p-mca-trace text-[10px] tabular-nums text-mca-ink-subtle/70"
          >
            {slot.slotIndex + 1}
          </li>
        ))}
      </ul>
    </div>
  );
}
