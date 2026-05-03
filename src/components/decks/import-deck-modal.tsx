"use client";

import { McaIcons } from "@/lib/icons/mca-icons";
import {
  Icon,
  InlineError,
  InlineSuccess,
  LoadingButton,
  ModalBase,
} from "@/mca-ui";
import { fetchJson, fetchJsonErrorMessage, useAsyncState } from "@/lib/client";
import type {
  DeckImportResultDTO,
  DeckImportAddedRowDTO,
  DeckImportUnmatchedRowDTO,
} from "@/lib/dto/deck-import";
import { useCallback, useEffect, useState } from "react";

type Zone = "main" | "sideboard" | "commander";

type AddedRow = DeckImportAddedRowDTO;
type UnmatchedRow = DeckImportUnmatchedRowDTO;

type Props = {
  open: boolean;
  deckId: string | null;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
};

export function ImportDeckModal({ open, deckId, onClose, onChanged }: Props) {
  const {
    run: runImport,
    loading: submitting,
    error: importError,
    reset: resetImport,
  } = useAsyncState<DeckImportResultDTO>();
  const [zone, setZone] = useState<Zone>("main");
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<AddedRow[] | null>(null);
  const [unmatched, setUnmatched] = useState<UnmatchedRow[] | null>(null);
  const surfaceError = error ?? importError;

  useEffect(() => {
    if (!open) {
      setZone("main");
      setPasted("");
      setError(null);
      setAdded(null);
      setUnmatched(null);
      resetImport();
    }
  }, [open, resetImport]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    onClose();
  }, [onClose, submitting]);

  const submit = useCallback(async () => {
    if (!deckId) return;
    setError(null);
    setAdded(null);
    setUnmatched(null);
    await runImport(async () => {
      const r = await fetchJson<DeckImportResultDTO>(
        `/api/decks/${encodeURIComponent(deckId)}/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pasted, zone }),
        }
      );
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      const data = r.data;
      const nextAdded = Array.isArray(data.added) ? data.added : [];
      const nextUnmatched = Array.isArray(data.unmatched) ? data.unmatched : [];
      setAdded(nextAdded);
      setUnmatched(nextUnmatched);
      if (nextAdded.length > 0) {
        await onChanged();
      }
      return data;
    });
  }, [deckId, pasted, zone, onChanged, runImport]);

  const showUnmatched = unmatched && unmatched.length > 0;
  const showAdded = added && added.length > 0;

  return (
    <ModalBase
      isOpen={Boolean(open && deckId)}
      onClose={handleClose}
      title="Import deck"
      panelClassName="max-w-lg"
      align="end"
      blockClose={submitting}
      bodyClassName="p-mca-lg"
      footer={
        <div className="flex w-full flex-col-reverse gap-mca-compact sm:flex-row sm:justify-end">
          <LoadingButton
            type="button"
            isLoading={submitting}
            disabled={!pasted.trim()}
            onClick={() => void submit()}
            className="inline-flex items-center justify-center gap-mca-sm rounded-mca-control bg-mca-accent-strong/90 px-mca-base py-mca-tight text-sm font-semibold text-mca-on-accent shadow-mca-card shadow-black/30 transition-all duration-200 ease-mca-standard hover:bg-mca-accent hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-60"
          >
            Import
          </LoadingButton>
        </div>
      }
    >
      <section aria-live="polite" aria-busy={submitting}>
      <p className="text-sm text-mca-ink-subtle">
        Supports TCGPlayer, Pokémon Showdown, and{" "}
        <span className="whitespace-nowrap">3× Name</span> text lines. This replaces all cards in the
        selected zone with matched collection cards.
      </p>
      <div className="mt-mca-base">
        <label htmlFor="import-zone" className="text-sm font-medium text-mca-ink-body">
          Zone
        </label>
        <select
          id="import-zone"
          value={zone}
          disabled={submitting}
          onChange={(e) => setZone(e.target.value as Zone)}
          className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface/80 px-mca-compact py-mca-tight text-sm text-mca-ink-strong outline-none transition-all duration-200 ease-mca-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50 dark:border-mca-border-subtle"
        >
          <option value="main">Main deck</option>
          <option value="sideboard">Side deck</option>
          <option value="commander">Brawl</option>
        </select>
      </div>

      {surfaceError ? (
        <InlineError className="my-mca-compact" showIcon>
          {surfaceError}
        </InlineError>
      ) : null}

      {showUnmatched ? (
        <div className="my-mca-base rounded-mca-block border border-mca-warning-surface-border/50 bg-mca-warning-surface/20 p-mca-compact">
          <p className="flex items-center gap-mca-sm text-sm font-semibold text-mca-nav-accent">
            <Icon src={McaIcons.ui.warning} size="sm" alt="" />
            Unmatched lines
          </p>
          <ul className="mt-mca-sm max-h-32 list-inside list-disc space-y-mca-xs overflow-y-auto text-xs text-mca-warning-tint/90">
            {unmatched!.map((u, i) => (
              <li key={`${u.line}-${i}`}>
                <span className="font-medium">{u.line}</span>
                {u.quantity ? ` ×${u.quantity}` : ""} — {u.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {showAdded ? (
        <InlineSuccess className="mb-mca-compact" showIcon>
          Imported {added!.length} card line(s).{showUnmatched ? " See unmatched lines above." : ""}
        </InlineSuccess>
      ) : null}

      <label htmlFor="import-paste" className="mt-mca-lg block text-sm font-medium text-mca-ink-body">
        Paste list
      </label>
      <textarea
        id="import-paste"
        value={pasted}
        disabled={submitting}
        onChange={(e) => setPasted(e.target.value)}
        placeholder={
          "Charizard – 3\n4 Pikachu\n3x Mew\n\nLines can be mixed; empty lines and # comments are ok."
        }
        className="mca-input mt-mca-sm h-48 w-full resize-y font-mono text-xs leading-relaxed text-mca-body"
      />
      </section>
    </ModalBase>
  );
}
