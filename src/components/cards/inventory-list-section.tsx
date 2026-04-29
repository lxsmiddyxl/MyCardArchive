"use client";

import { InventoryCardRow } from "@/components/cards/inventory-card-row";
import type { InventoryCardItem } from "@/components/cards/inventory-types";
import { useCallback, useEffect, useRef, useState } from "react";

const ROW_HEIGHT = 268;
const VIRT_OVERSCAN = 1;

function InventoryVirtualGrid({
  items,
  cols,
  listBusy,
  onOpenDetail,
}: {
  items: InventoryCardItem[];
  cols: number;
  listBusy: boolean;
  onOpenDetail: (id: string) => void;
}) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewH, setViewH] = useState(640);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewH(el.clientHeight));
    ro.observe(el);
    setViewH(el.clientHeight);
    return () => ro.disconnect();
  }, [items.length]);

  const rowCount = Math.ceil(items.length / cols) || 0;
  const totalHeight = Math.max(1, rowCount) * ROW_HEIGHT;

  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - VIRT_OVERSCAN);
  const endRow = Math.min(rowCount, Math.ceil((scrollTop + viewH) / ROW_HEIGHT) + VIRT_OVERSCAN);

  const startIdx = startRow * cols;
  const endIdx = Math.min(items.length, endRow * cols);
  const slice = startIdx < endIdx ? items.slice(startIdx, endIdx) : [];

  return (
    <div
      ref={outerRef}
      className="max-h-[min(70vh,880px)] overflow-y-auto overscroll-contain"
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ height: totalHeight }}>
        <div
          className="absolute inset-x-0 grid gap-mca-md px-0"
          style={{
            top: startRow * ROW_HEIGHT,
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          }}
        >
          {slice.map((card) => (
            <InventoryCardRow key={card.id} card={card} listBusy={listBusy} onOpenDetail={onOpenDetail} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InventoryListSection({
  items,
  cols,
  listBusy,
  onOpenDetail,
}: {
  items: InventoryCardItem[];
  cols: number;
  listBusy: boolean;
  onOpenDetail: (id: string) => void;
}) {
  const stableOpen = useCallback(
    (id: string) => {
      onOpenDetail(id);
    },
    [onOpenDetail]
  );

  if (items.length > 12) {
    return (
      <InventoryVirtualGrid
        items={items}
        cols={cols}
        listBusy={listBusy}
        onOpenDetail={stableOpen}
      />
    );
  }

  return (
    <div className="grid gap-mca-md sm:grid-cols-2 lg:grid-cols-3">
      {items.map((card) => (
        <InventoryCardRow key={card.id} card={card} listBusy={listBusy} onOpenDetail={stableOpen} />
      ))}
    </div>
  );
}

export default InventoryListSection;
