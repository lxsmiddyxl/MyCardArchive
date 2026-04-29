"use client";

import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import { InlineError } from "@/mca-ui/inline-error";
import { LoadingButton } from "@/mca-ui/loading-button";
import { ModalBase } from "@/mca-ui/modal-base";
import { useEffect, useId, useMemo, useState } from "react";

type Deck = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  cardName: string;
  loading: boolean;
  decks: Deck[];
  onClose: () => void;
  onConfirm: (deckId: string) => Promise<void>;
};

export function SelectDeckModal({
  open,
  cardName,
  loading,
  decks,
  onClose,
  onConfirm,
}: Props) {
  const descId = useId();
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => open && !loading && selectedId.length > 0,
    [loading, open, selectedId]
  );

  useEffect(() => {
    if (!open) return;
    setSelectedId(decks[0]?.id ?? "");
    setError(null);
  }, [open, decks]);

  return (
    <ModalBase
      isOpen={open}
      onClose={onClose}
      title="Add to Deck"
      descriptionId={descId}
      panelClassName="max-w-md"
      blockClose={loading}
      bodyClassName="p-mca-lg"
      footer={
        <div className="flex w-full justify-end gap-mca-compact">
          <LoadingButton
            type="button"
            isLoading={loading}
            disabled={!canSubmit}
            onClick={async () => {
              try {
                setError(null);
                await onConfirm(selectedId);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Failed to add card");
              }
            }}
            className="inline-flex items-center justify-center gap-mca-sm rounded-mca-control bg-mca-accent-strong px-mca-base py-mca-sm text-sm font-semibold text-mca-on-accent transition-all duration-200 ease-mca-standard hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
          >
            Add
          </LoadingButton>
        </div>
      }
    >
      <p
        id={descId}
        className="flex items-center gap-mca-sm text-sm font-medium text-mca-ink-muted"
      >
        <Icon src={McaIcons.collection.deck} size="md" alt="" />
        <span>{cardName}</span>
      </p>

      {decks.length === 0 ? (
        <div className="mt-mca-base flex items-start gap-mca-compact rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 p-mca-compact text-sm text-mca-ink-muted dark:border-mca-border-subtle">
          <Icon src={McaIcons.system.info} size="md" alt="" className="shrink-0 opacity-90" />
          <p>No decks found. Create a deck first.</p>
        </div>
      ) : (
        <select
          className="mt-mca-base w-full rounded-mca-control border border-mca-border bg-mca-surface-elevated/95 px-mca-base py-mca-tight text-sm text-mca-ink-strong transition-all duration-200 ease-mca-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50 dark:border-mca-border-subtle"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={loading}
          aria-label="Choose deck"
        >
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>
      )}

      {error ? (
        <InlineError className="mt-mca-compact" showIcon>
          {error}
        </InlineError>
      ) : null}
    </ModalBase>
  );
}
