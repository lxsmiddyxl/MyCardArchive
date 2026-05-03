"use client";

import { BinderSlotCell, type BinderSlotCellProps } from "@/components/binders/binder-slot-cell";
import { memo } from "react";

type SlotSlice = Pick<
  BinderSlotCellProps,
  | "page"
  | "slotIndex"
  | "cardId"
  | "card"
  | "busy"
  | "isDragOver"
  | "gridCellId"
  | "isGridActive"
  | "onOpenDetail"
  | "onOpenPicker"
  | "onMove"
  | "onDragOverSlot"
  | "onDragLeaveSlot"
  | "onClearDragOver"
>;

export type BinderGridRowProps = {
  rowKey: string;
  slots: SlotSlice[];
};

function BinderGridRowInner({ rowKey, slots }: BinderGridRowProps) {
  return (
    <>
      {slots.map((s) => (
        <BinderSlotCell
          key={`${rowKey}-${s.slotIndex}`}
          page={s.page}
          slotIndex={s.slotIndex}
          cardId={s.cardId}
          card={s.card}
          busy={s.busy}
          isDragOver={s.isDragOver}
          gridCellId={s.gridCellId}
          isGridActive={s.isGridActive}
          onOpenDetail={s.onOpenDetail}
          onOpenPicker={s.onOpenPicker}
          onMove={s.onMove}
          onDragOverSlot={s.onDragOverSlot}
          onDragLeaveSlot={s.onDragLeaveSlot}
          onClearDragOver={s.onClearDragOver}
        />
      ))}
    </>
  );
}

function rowPropsEqual(a: BinderGridRowProps, b: BinderGridRowProps): boolean {
  if (a.rowKey !== b.rowKey || a.slots.length !== b.slots.length) return false;
  for (let i = 0; i < a.slots.length; i++) {
    const x = a.slots[i];
    const y = b.slots[i];
    if (
      x.page !== y.page ||
      x.slotIndex !== y.slotIndex ||
      x.cardId !== y.cardId ||
      x.busy !== y.busy ||
      x.isDragOver !== y.isDragOver ||
      x.gridCellId !== y.gridCellId ||
      x.isGridActive !== y.isGridActive ||
      x.card?.id !== y.card?.id ||
      x.card?.name !== y.card?.name ||
      x.card?.image_url !== y.card?.image_url ||
      x.card?.image_front_thumb_url !== y.card?.image_front_thumb_url ||
      x.onOpenDetail !== y.onOpenDetail ||
      x.onOpenPicker !== y.onOpenPicker ||
      x.onMove !== y.onMove ||
      x.onDragOverSlot !== y.onDragOverSlot ||
      x.onDragLeaveSlot !== y.onDragLeaveSlot ||
      x.onClearDragOver !== y.onClearDragOver
    ) {
      return false;
    }
  }
  return true;
}

/** One row of the binder grid (typically {BINDER_GRID_COLS} slots), memoized for fewer child reconciliations. */
export const BinderGridRow = memo(BinderGridRowInner, rowPropsEqual);
