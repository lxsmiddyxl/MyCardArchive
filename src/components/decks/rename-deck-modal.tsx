"use client";

import {
  modalBackdropClasses,
  modalPanelClasses,
  useModalMount,
} from "@/lib/ui/use-modal-mount";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { useCallback, useEffect, useId, useState } from "react";

type Props = {
  open: boolean;
  deckId: string | null;
  initialName: string;
  onClose: () => void;
  onRenamed: () => void;
};

export function RenameDeckModal({
  open,
  deckId,
  initialName,
  onClose,
  onRenamed,
}: Props) {
  const titleId = useId();
  const { mounted, animIn } = useModalMount(open && Boolean(deckId), 200);
  const [name, setName] = useState(initialName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
      setSubmitting(false);
    }
  }, [open, initialName]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setError(null);
    onClose();
  }, [onClose, submitting]);

  const submit = useCallback(async () => {
    const trimmed = name.trim();
    if (!deckId) return;
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetchJson("/api/decks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_id: deckId,
          name: trimmed,
        }),
      });
      if (r.kind !== "ok") {
        setError(fetchJsonErrorMessage(r));
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      onRenamed();
      onClose();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }, [deckId, name, onClose, onRenamed]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-mca-base sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className={modalBackdropClasses(animIn)}
        aria-label="Close dialog"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={modalPanelClasses(
          animIn,
          "w-full max-w-md rounded-mca-card border border-mca-border bg-mca-surface-elevated/95 p-mca-lg shadow-mca-card shadow-black/40 dark:border-mca-border-subtle"
        )}
        aria-live="polite"
        aria-busy={submitting}
      >
        <h2 id={titleId} className="mca-section-reveal text-lg font-semibold text-mca-ink-strong">
          Rename deck
        </h2>
        <p className="mt-mca-xs text-sm text-mca-ink-subtle">
          Choose a new name for this deck.
        </p>

        <div className="mt-mca-lg">
          <label
            htmlFor="rename-deck-name"
            className="block text-sm font-medium text-mca-ink-body"
          >
            Name
          </label>
          <input
            id="rename-deck-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mca-input mt-mca-sm rounded-mca-control"
            autoComplete="off"
          />
        </div>

        {error ? (
          <p
            className="mt-mca-base rounded-mca-block border border-red-900/50 bg-red-950/30 px-mca-compact py-mca-sm text-sm text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-mca-lg flex flex-col-reverse gap-mca-compact sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-mca-control border border-mca-border-subtle bg-mca-surface-elevated/80 px-mca-base py-mca-tight text-sm font-semibold text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-mca-chrome/60 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="rounded-mca-control bg-mca-accent-strong/90 px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-card shadow-black/30 transition-all duration-200 ease-mca-standard hover:bg-mca-accent hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
