"use client";

import { SwipeRevealActions } from "@/components/mobile/swipe-reveal-actions";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useLongPress } from "@/lib/ui/use-long-press";
import { useCallback } from "@/lib/perf/memo";
import type { DragEvent, KeyboardEvent } from "react";
import { memo, useState } from "react";

const DRAG_MIME = "application/x-mycardarchive-binder-slot";

export type SlotCardLite = {
  id: string;
  name: string;
  image_url: string | null;
  /** Same as `image_url` when stored in DB (thumb for uploaded photos). */
  image_front_thumb_url?: string | null;
};

export type BinderSlotCellProps = {
  page: number;
  slotIndex: number;
  cardId: string | null;
  card: SlotCardLite | null;
  busy: boolean;
  isDragOver: boolean;
  onOpenDetail: (cardId: string) => void;
  onOpenPicker: (page: number, slot: number) => void;
  onMove: (
    from: { page: number; slot: number },
    to: { page: number; slot: number }
  ) => void;
  onDragOverSlot: (page: number, slot: number) => void;
  onDragLeaveSlot: (page: number, slot: number) => void;
  onClearDragOver: () => void;
};

function BinderSlotCellInner({
  page,
  slotIndex,
  cardId,
  card,
  busy,
  isDragOver,
  onOpenDetail,
  onOpenPicker,
  onMove,
  onDragOverSlot,
  onDragLeaveSlot,
  onClearDragOver,
}: BinderSlotCellProps) {
  const [dragging, setDragging] = useState(false);
  const thumbSrc = card?.image_front_thumb_url ?? card?.image_url ?? null;
  const hasCard = Boolean(cardId && card);

  const onClick = useCallback(() => {
    if (hasCard && card) onOpenDetail(card.id);
    else onOpenPicker(page, slotIndex);
  }, [hasCard, card, onOpenDetail, onOpenPicker, page, slotIndex]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (hasCard && card) onOpenDetail(card.id);
        else onOpenPicker(page, slotIndex);
      }
    },
    [hasCard, card, onOpenDetail, onOpenPicker, page, slotIndex]
  );

  const onDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (busy) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      onDragOverSlot(page, slotIndex);
    },
    [busy, onDragOverSlot, page, slotIndex]
  );

  const onDragLeave = useCallback(() => {
    onDragLeaveSlot(page, slotIndex);
  }, [onDragLeaveSlot, page, slotIndex]);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (busy) return;
      onClearDragOver();
      let raw = e.dataTransfer.getData(DRAG_MIME);
      if (!raw) {
        try {
          raw = e.dataTransfer.getData("text/plain");
        } catch {
          /* ignore */
        }
      }
      if (!raw) return;
      try {
        const from = JSON.parse(raw) as { page: number; slot: number };
        if (
          typeof from.page === "number" &&
          typeof from.slot === "number" &&
          !(from.page === page && from.slot === slotIndex)
        ) {
          onMove(from, { page, slot: slotIndex });
        }
      } catch {
        /* ignore */
      }
    },
    [busy, onClearDragOver, onMove, page, slotIndex]
  );

  const dragPayload = useCallback(
    (e: DragEvent) => {
      e.stopPropagation();
      const payload = JSON.stringify({ page, slot: slotIndex });
      e.dataTransfer.setData(DRAG_MIME, payload);
      e.dataTransfer.setData("text/plain", payload);
      e.dataTransfer.effectAllowed = "move";
    },
    [page, slotIndex]
  );

  const onDragEnd = useCallback(() => {
    setDragging(false);
    onClearDragOver();
  }, [onClearDragOver]);

  const onImgDragStart = useCallback(
    (e: DragEvent<HTMLImageElement>) => {
      setDragging(true);
      dragPayload(e);
    },
    [dragPayload]
  );

  const onPlaceholderDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      setDragging(true);
      dragPayload(e);
    },
    [dragPayload]
  );

  const longPress = useLongPress(
    hasCard && card
      ? () => {
          mcaLog.event(
            "mobile.gesture",
            { kind: "long_press_card", surface: "binder-slot" },
            { componentName: "BinderSlotCell", surfaceName: "binder-viewer" }
          );
          onOpenDetail(card.id);
        }
      : undefined,
    { durationMs: 520 }
  );

  const cellClassName = `group relative flex aspect-[3/4] flex-col overflow-hidden rounded-mca-block border shadow-mca-panel transition-[transform,box-shadow,border-color,background-color] duration-200 ease-mca-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98] motion-reduce:transition-none dark:border-mca-border-subtle ${
    isDragOver
      ? "z-10 border-mca-success/70 bg-mca-success-bold/15 shadow-mca-card shadow-mca-success-surface/20 ring-2 ring-mca-success/50"
      : dragging
        ? "scale-[1.03] z-20 border-mca-accent-strong/40 bg-mca-surface-elevated/70 shadow-mca-card shadow-black/40"
        : "border-mca-border/90 bg-mca-surface-elevated/55 shadow-black/25 hover:-translate-y-0.5 hover:border-mca-field-border hover:bg-mca-chrome/35 hover:shadow-mca-card hover:shadow-black/30"
  } ${busy ? "pointer-events-none opacity-60" : ""}`;

  const cellInner = (
    <div
      role="button"
      tabIndex={0}
      className={cellClassName}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPointerDown={longPress.onPointerDown}
      onPointerMove={longPress.onPointerMove}
      onPointerUp={longPress.onPointerUp}
      onPointerCancel={longPress.onPointerCancel}
    >
      {hasCard && card ? (
        <>
          {thumbSrc ? (
            <div className="relative min-h-0 flex-1 w-full">
              <RemoteCardThumb
                src={thumbSrc}
                alt={card.name}
                sizes="(max-width: 640px) 30vw, 160px"
                className="object-cover"
                draggable={!busy}
                onDragStart={onImgDragStart}
                onDragEnd={onDragEnd}
              />
            </div>
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-mca-chrome to-mca-surface-elevated p-mca-compact text-center"
              draggable={!busy}
              onDragStart={onPlaceholderDragStart}
              onDragEnd={onDragEnd}
            >
              <p className="text-xs font-medium text-mca-ink-body">{card.name}</p>
            </div>
          )}
          {thumbSrc ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-mca-sm">
              <p className="line-clamp-2 text-center text-[10px] font-medium text-white sm:text-xs">
                {card.name}
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div
          className="flex h-full flex-col items-center justify-center gap-mca-sm p-mca-compact text-center"
          draggable={!busy}
          onDragStart={onPlaceholderDragStart}
          onDragEnd={onDragEnd}
        >
          <Icon
            src={McaIcons.collection.slotEmpty}
            size="lg"
            alt=""
            className="opacity-80 transition-all duration-200 ease-mca-standard group-hover:opacity-100"
          />
          <span className="text-[10px] uppercase tracking-wider text-mca-ink-subtle">
            Empty slot
          </span>
        </div>
      )}
    </div>
  );

  if (hasCard && card) {
    return (
      <SwipeRevealActions
        surface="binder-slot"
        revealWidth={92}
        className="border-mca-border/90 shadow-mca-panel dark:border-mca-border-subtle"
        actions={
          <div className="flex h-full min-h-[6rem] w-full">
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-center gap-mca-trace bg-mca-accent-strong/25 px-mca-micro text-[10px] font-semibold uppercase tracking-wide text-mca-nav-accent transition-colors duration-200 ease-mca-standard hover:bg-mca-accent-strong/35"
              onClick={() => onOpenDetail(card.id)}
            >
              Open
            </button>
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-center gap-mca-trace bg-mca-chrome px-mca-micro text-[10px] font-semibold uppercase tracking-wide text-mca-ink-strong transition-colors duration-200 ease-mca-standard hover:bg-mca-border-subtle"
              onClick={() => onOpenPicker(page, slotIndex)}
            >
              Slot
            </button>
          </div>
        }
      >
        {cellInner}
      </SwipeRevealActions>
    );
  }

  return cellInner;
}

function propsEqual(prev: BinderSlotCellProps, next: BinderSlotCellProps): boolean {
  return (
    prev.page === next.page &&
    prev.slotIndex === next.slotIndex &&
    prev.cardId === next.cardId &&
    prev.busy === next.busy &&
    prev.isDragOver === next.isDragOver &&
    prev.card?.id === next.card?.id &&
    prev.card?.name === next.card?.name &&
    prev.card?.image_url === next.card?.image_url &&
    prev.card?.image_front_thumb_url === next.card?.image_front_thumb_url &&
    prev.onOpenDetail === next.onOpenDetail &&
    prev.onOpenPicker === next.onOpenPicker &&
    prev.onMove === next.onMove &&
    prev.onDragOverSlot === next.onDragOverSlot &&
    prev.onDragLeaveSlot === next.onDragLeaveSlot &&
    prev.onClearDragOver === next.onClearDragOver
  );
}

export const BinderSlotCell = memo(BinderSlotCellInner, propsEqual);
