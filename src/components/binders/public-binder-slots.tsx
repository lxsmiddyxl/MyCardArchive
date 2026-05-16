"use client";

import { BINDER_GRID_COLS, BINDER_SLOTS_PER_PAGE } from "@/lib/binders/constants";
import Image from "next/image";

export type PublicBinderSlotCard = {
  slot_index: number;
  card_id: string | null;
  name: string | null;
  image_url: string | null;
};

export type PublicBinderSlotsProps = {
  page: number;
  slots: PublicBinderSlotCard[];
};

export function PublicBinderSlots({ page, slots }: PublicBinderSlotsProps) {
  const byIndex = new Map(slots.map((s) => [s.slot_index, s]));
  const cells = Array.from({ length: BINDER_SLOTS_PER_PAGE }, (_, slot_index) => {
    const slot = byIndex.get(slot_index);
    return { slot_index, ...slot };
  });

  return (
    <div
      className="grid gap-mca-sm"
      style={{ gridTemplateColumns: `repeat(${BINDER_GRID_COLS}, minmax(0, 1fr))` }}
      aria-label={`Binder page ${page + 1}`}
    >
      {cells.map((cell) => (
        <div
          key={cell.slot_index}
          className="relative aspect-[2.5/3.5] overflow-hidden rounded-mca-control border border-mca-border-subtle/80 bg-mca-chrome/30"
        >
          {cell?.image_url ? (
            <Image
              src={cell.image_url}
              alt={cell.name ?? "Card"}
              fill
              sizes="120px"
              className="object-contain p-mca-trace"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-xs text-mca-ink-subtle">
              Empty
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
