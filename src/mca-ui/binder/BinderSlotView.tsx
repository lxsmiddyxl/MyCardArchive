"use client";

import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { Button } from "@/mca-ui/button";
import { ModalBase } from "@/mca-ui/modal-base";
import { Panel } from "@/mca-ui/panel";
import type { BinderSlotDTO } from "@/lib/dto/binder";
import Link from "next/link";
import { useCallback, useState } from "react";

export type BinderSlotViewProps = {
  binderId: string;
  binderName: string;
  slot: BinderSlotDTO | null;
  page: number;
  slotIndex: number;
  busy?: boolean;
  onMove: (to: { page: number; slot: number }) => void;
  onCopy: (to: { page: number; slot: number }) => void;
  onRemove: (deleteCard: boolean) => void;
  onReplace: () => void;
};

export function BinderSlotView({
  binderId,
  binderName,
  slot,
  page,
  slotIndex,
  busy,
  onMove,
  onCopy,
  onRemove,
  onReplace,
}: BinderSlotViewProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [targetPage, setTargetPage] = useState(String(page));
  const [targetSlot, setTargetSlot] = useState(String(slotIndex));
  const [deleteCard, setDeleteCard] = useState(false);

  const card = slot?.card ?? null;
  const hasCard = Boolean(slot?.card_id && card);

  const applyTarget = useCallback(() => {
    const p = Math.max(0, Math.floor(Number(targetPage)));
    const s = Math.floor(Number(targetSlot));
    if (!Number.isFinite(p) || !Number.isFinite(s) || s < 0 || s > 23) return;
    return { page: p, slot: s };
  }, [targetPage, targetSlot]);

  return (
    <div className="space-y-mca-lg">
      <Panel className="space-y-mca-md">
        <div className="flex flex-wrap items-start justify-between gap-mca-md">
          <div>
            <h2 className="text-lg font-semibold text-mca-ink-strong">
              {binderName} · Page {page + 1} · Slot {slotIndex + 1}
            </h2>
            <p className="mt-mca-xs text-sm text-mca-ink-muted">
              {hasCard ? card!.name : "Empty slot"}
            </p>
          </div>
          <Link
            href={`/binders/${encodeURIComponent(binderId)}/pages?page=${page}`}
            className="text-sm font-medium text-mca-accent-strong/90 hover:text-mca-accent"
          >
            Back to pages
          </Link>
        </div>

        {hasCard && card ? (
          <div className="mx-auto max-w-xs">
            <RemoteCardThumb
              src={card.image_url ?? ""}
              alt={card.name}
              sizes="280px"
              className="aspect-[3/4] w-full rounded-mca-card object-cover shadow-mca-card"
            />
            <p className="mt-mca-sm text-center text-sm text-mca-ink-body">
              {card.number ? `#${card.number}` : null}
              {card.rarity ? ` · ${card.rarity}` : null}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-mca-md py-mca-xl text-center">
            <p className="text-sm text-mca-ink-muted">This slot is empty.</p>
            <div className="flex flex-wrap justify-center gap-mca-sm">
              <Link
                href={`/binders/${encodeURIComponent(binderId)}/add-card`}
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-accent-border/50 bg-mca-accent-strong/90 px-mca-compact py-mca-sm text-sm font-semibold text-mca-on-accent"
              >
                Add card to this slot
              </Link>
              <Link
                href="/scan"
                className="inline-flex min-h-[2.75rem] items-center justify-center rounded-mca-control border border-mca-field-border bg-mca-chrome px-mca-compact py-mca-sm text-sm font-semibold text-mca-ink-strong"
              >
                Scan card for this slot
              </Link>
            </div>
          </div>
        )}

        {hasCard ? (
          <div className="space-y-mca-md border-t border-mca-border-subtle/80 pt-mca-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle">
              Move or copy to
            </p>
            <div className="flex flex-wrap gap-mca-sm">
              <label className="text-xs text-mca-ink-muted">
                Page
                <input
                  type="number"
                  min={0}
                  value={targetPage}
                  disabled={busy}
                  onChange={(e) => setTargetPage(e.target.value)}
                  className="ml-mca-xs w-16 rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-tight text-sm"
                />
              </label>
              <label className="text-xs text-mca-ink-muted">
                Slot
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={targetSlot}
                  disabled={busy}
                  onChange={(e) => setTargetSlot(e.target.value)}
                  className="ml-mca-xs w-16 rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-sm py-mca-tight text-sm"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-mca-sm">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  const t = applyTarget();
                  if (t) onMove(t);
                }}
              >
                Move card
              </Button>
              <Button
                type="button"
                variant="tertiary"
                disabled={busy}
                onClick={() => {
                  const t = applyTarget();
                  if (t) onCopy(t);
                }}
              >
                Copy card
              </Button>
              <Button type="button" variant="tertiary" disabled={busy} onClick={onReplace}>
                Replace card
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => setConfirmRemove(true)}
              >
                Remove from slot
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      <ModalBase isOpen={confirmRemove} onClose={() => setConfirmRemove(false)} title="Remove card?">
        <p className="text-sm text-mca-ink-muted">
          Clear this slot. Optionally delete the card from your binder entirely.
        </p>
        <label className="mt-mca-md flex items-center gap-mca-sm text-sm text-mca-ink-body">
          <input
            type="checkbox"
            checked={deleteCard}
            onChange={(e) => setDeleteCard(e.target.checked)}
          />
          Delete card from binder
        </label>
        <div className="mt-mca-lg flex justify-end gap-mca-sm">
          <Button type="button" variant="tertiary" onClick={() => setConfirmRemove(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={busy}
            onClick={() => {
              setConfirmRemove(false);
              onRemove(deleteCard);
            }}
          >
            Confirm
          </Button>
        </div>
      </ModalBase>
    </div>
  );
}
