"use client";

import {
  DECK_FORMAT_OPTIONS,
  type DeckFormatOptionValue,
} from "@/lib/decks/format-options";
import {
  modalBackdropClasses,
  modalPanelClasses,
  useModalMount,
} from "@/lib/ui/use-modal-mount";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useCallback, useEffect, useId, useState } from "react";

const TEL = { componentName: "CreateDeckModal", surfaceName: "deck-editor" } as const;

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateDeckModal({ open, onClose, onCreated }: Props) {
  const titleId = useId();
  const { mounted, animIn } = useModalMount(open, 200);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<DeckFormatOptionValue>("standard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setName("");
    setDescription("");
    setFormat("standard");
    setError(null);
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [onClose, submitting]);

  const submit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetchJson("/api/decks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim(),
          format,
        }),
      });
      if (r.kind !== "ok") {
        setError(fetchJsonErrorMessage(r));
        setSubmitting(false);
        return;
      }
      mcaLog.event("deck.create.success", { format }, TEL);
      onCreated();
      onClose();
    } catch {
      setError("Network error. Try again.");
      setSubmitting(false);
    }
  }, [description, format, name, onClose, onCreated]);

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
          Create deck
        </h2>
        <p className="mt-mca-xs text-sm text-mca-ink-subtle">
          Name your deck and pick a format. You can edit later.
        </p>

        <div className="mt-mca-lg space-y-mca-base">
          <div>
            <label
              htmlFor="deck-name"
              className="block text-sm font-medium text-mca-ink-body"
            >
              Name <span className="text-red-400">*</span>
            </label>
            <input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mca-input mt-mca-sm rounded-mca-control placeholder:text-mca-hint"
              placeholder="My main deck"
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="deck-desc"
              className="block text-sm font-medium text-mca-ink-body"
            >
              Description
            </label>
            <textarea
              id="deck-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mca-input mt-mca-sm resize-none rounded-mca-control placeholder:text-mca-hint min-h-[5rem]"
              placeholder="Optional notes…"
            />
          </div>
          <div>
            <label
              htmlFor="deck-format"
              className="block text-sm font-medium text-mca-ink-body"
            >
              Format
            </label>
            <select
              id="deck-format"
              value={format}
              onChange={(e) =>
                setFormat(e.target.value as DeckFormatOptionValue)
              }
              className="mca-input mt-mca-sm rounded-mca-control"
            >
              {DECK_FORMAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
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
            {submitting ? "Creating…" : "Create deck"}
          </button>
        </div>
      </div>
    </div>
  );
}
