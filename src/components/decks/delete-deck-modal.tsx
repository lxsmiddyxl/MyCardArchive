"use client";

import {
  modalBackdropClasses,
  modalPanelClasses,
  useModalMount,
} from "@/lib/ui/use-modal-mount";
import { useCallback, useId, useState } from "react";

type Props = {
  open: boolean;
  deckId: string | null;
  deckName: string;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteDeckModal({
  open,
  deckId,
  deckName,
  onClose,
  onDeleted,
}: Props) {
  const titleId = useId();
  const { mounted, animIn } = useModalMount(open && Boolean(deckId), 200);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setError(null);
    onClose();
  }, [onClose, submitting]);

  const confirmDelete = useCallback(async () => {
    if (!deckId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/decks/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck_id: deckId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not delete deck.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      onDeleted();
      onClose();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }, [deckId, onClose, onDeleted]);

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
      >
        <h2 id={titleId} className="mca-section-reveal text-lg font-semibold text-mca-ink-strong">
          Delete deck?
        </h2>
        <p className="mt-mca-sm text-sm leading-relaxed text-mca-ink-muted">
          <span className="font-medium text-mca-ink-soft">{deckName}</span> and
          its cards will be removed. This cannot be undone.
        </p>

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
            onClick={() => void confirmDelete()}
            disabled={submitting}
            className="rounded-mca-control border border-red-900/60 bg-red-950/50 px-mca-base py-mca-tight text-sm font-semibold text-red-100 transition-all duration-200 ease-mca-standard hover:bg-red-900/50 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-60"
          >
            {submitting ? "Deleting…" : "Delete deck"}
          </button>
        </div>
      </div>
    </div>
  );
}
