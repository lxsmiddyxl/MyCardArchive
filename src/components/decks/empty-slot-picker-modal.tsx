"use client";

import { McaVirtualList } from "@/components/ui/mca-virtual-list";
import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import { LoadingButton } from "@/mca-ui/loading-button";
import { ModalBase } from "@/mca-ui/modal-base";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { rarityIconSrc } from "@/lib/icons/rarity";
import Link from "next/link";
import { memo } from "react";

export type EmptySlotPickerCard = {
  id: string;
  name: string;
  binder_id: string;
  image_url: string | null;
  rarity: string | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  binderId: string;
  cards: EmptySlotPickerCard[];
  busy: boolean;
  /** When set, the row for this card id shows a loading state */
  assigningCardId: string | null;
  onPick: (cardId: string) => void;
};

const PickerCardRow = memo(function PickerCardRow({
  card,
  rowBusy,
  disableOthers,
  onPick,
}: {
  card: EmptySlotPickerCard;
  rowBusy: boolean;
  disableOthers: boolean;
  onPick: (cardId: string) => void;
}) {
  return (
    <div role="listitem">
      <LoadingButton
        type="button"
        isLoading={rowBusy}
        disabled={disableOthers}
        onClick={() => onPick(card.id)}
        className="flex w-full items-center gap-mca-compact rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 px-mca-compact py-mca-tight text-left shadow-mca-panel transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/40 hover:shadow-mca-panel hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50 dark:border-mca-border-subtle"
      >
        <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface dark:border-mca-border-subtle">
          {card.image_url ? (
            <RemoteCardThumb
              src={card.image_url}
              alt=""
              sizes="36px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[8px] text-mca-hint">—</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-mca-ink-strong">{card.name}</p>
          <p className="flex items-center gap-mca-micro text-xs text-mca-ink-subtle">
            <Icon src={rarityIconSrc(card.rarity)} size="sm" alt="" />
            <span>{card.rarity ?? "—"}</span>
          </p>
        </div>
      </LoadingButton>
    </div>
  );
});

export function EmptySlotPickerModal({
  isOpen,
  onClose,
  binderId,
  cards,
  busy,
  assigningCardId,
  onPick,
}: Props) {
  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Add card to slot"
      panelClassName="max-w-lg"
      blockClose={busy}
      bodyClassName="p-mca-lg"
    >
      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-mca-compact py-mca-lg text-center text-sm text-mca-ink-subtle">
          <Icon src={McaIcons.system.info} size="lg" alt="" />
          <p>
            No cards in this binder yet.{" "}
            <Link
              href={`/binders/${encodeURIComponent(binderId)}/add-card`}
              className="text-mca-accent hover:underline"
            >
              Add a card
            </Link>
            .
          </p>
        </div>
      ) : cards.length <= 8 ? (
        <ul className="max-h-[60vh] space-y-mca-sm overflow-y-auto" role="list">
          {cards.map((c) => {
            const rowBusy = assigningCardId === c.id;
            const disableOthers = busy && !rowBusy;
            return (
              <PickerCardRow
                key={c.id}
                card={c}
                rowBusy={rowBusy}
                disableOthers={disableOthers}
                onPick={onPick}
              />
            );
          })}
        </ul>
      ) : (
        <McaVirtualList
          className="max-h-[60vh]"
          items={cards}
          estimateSize={72}
          overscan={6}
          getItemKey={(c) => c.id}
          renderItem={(c) => {
            const rowBusy = assigningCardId === c.id;
            const disableOthers = busy && !rowBusy;
            return (
              <PickerCardRow
                card={c}
                rowBusy={rowBusy}
                disableOthers={disableOthers}
                onPick={onPick}
              />
            );
          }}
        />
      )}
    </ModalBase>
  );
}
