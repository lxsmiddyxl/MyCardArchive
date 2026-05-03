"use client";

import { McaIcons } from "@/lib/icons/mca-icons";
import {
  Icon,
  InlineError,
  InlineSuccess,
  LoadingButton,
  ModalBase,
} from "@/mca-ui";
import { fetchText, useAsyncState } from "@/lib/client";
import { useCallback, useEffect, useState } from "react";

export type DeckExportFormat = "tcgplayer" | "showdown" | "txt";

type Props = {
  open: boolean;
  deckId: string | null;
  onClose: () => void;
};

export function ExportDeckModal({ open, deckId, onClose }: Props) {
  const [format, setFormat] = useState<DeckExportFormat>("tcgplayer");
  const {
    run: runExport,
    data: exportText,
    loading: exportLoading,
    error: exportError,
    reset: resetExport,
  } = useAsyncState<string>();
  const {
    run: runCopy,
    loading: copyBusy,
    error: copyError,
    reset: resetCopy,
  } = useAsyncState<void>();
  const [copyOk, setCopyOk] = useState(false);

  const text = exportText ?? "";
  const loading = exportLoading;
  const surfaceError = exportError ?? copyError;

  const loadExport = useCallback(async () => {
    if (!deckId) return;
    await runExport(async () => {
      const r = await fetchText(
        `/api/decks/${encodeURIComponent(deckId)}/export?format=${encodeURIComponent(format)}`,
        { cache: "no-store" }
      );
      if (r.kind !== "ok") {
        throw new Error(r.message || "Export failed");
      }
      return r.text;
    });
  }, [deckId, format, runExport]);

  useEffect(() => {
    if (!open || !deckId) return;
    void loadExport();
  }, [open, deckId, format, loadExport]);

  useEffect(() => {
    if (!open) {
      setFormat("tcgplayer");
      setCopyOk(false);
      resetExport();
      resetCopy();
    }
  }, [open, resetExport, resetCopy]);

  const handleClose = useCallback(() => {
    if (loading || copyBusy) return;
    onClose();
  }, [loading, copyBusy, onClose]);

  const copy = useCallback(async () => {
    if (!text) return;
    setCopyOk(false);
    await runCopy(async () => {
      await navigator.clipboard.writeText(text);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 2000);
    });
  }, [text, runCopy]);

  return (
    <ModalBase
      isOpen={Boolean(open && deckId)}
      onClose={handleClose}
      title="Export deck"
      panelClassName="max-w-lg"
      align="end"
      blockClose={loading || copyBusy}
      bodyClassName="p-mca-lg"
      footer={
        <div className="flex w-full flex-col-reverse gap-mca-compact sm:flex-row sm:justify-end">
          <LoadingButton
            type="button"
            isLoading={loading || copyBusy}
            disabled={!text}
            onClick={() => void copy()}
            className="inline-flex items-center justify-center gap-mca-sm rounded-mca-control border border-mca-accent-strong/50 bg-mca-accent-strong/10 px-mca-base py-mca-tight text-sm font-semibold text-mca-nav-accent transition-all duration-200 ease-mca-standard hover:bg-mca-accent-strong/20 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-50"
          >
            {copyOk ? (
              <>
                <Icon src={McaIcons.ui.check} size="sm" alt="" />
                Copied!
              </>
            ) : (
              "Copy to clipboard"
            )}
          </LoadingButton>
        </div>
      }
    >
      <section aria-live="polite" aria-busy={loading}>
        <p className="text-mca-body text-mca-ink-subtle">
          Main deck, side deck, and Brawl are separated by blank lines.
        </p>
        <div className="mt-mca-base">
          <label htmlFor="export-format" className="text-mca-body font-medium text-mca-ink-body">
            Format
          </label>
          <select
            id="export-format"
            value={format}
            disabled={loading || copyBusy}
            onChange={(e) => setFormat(e.target.value as DeckExportFormat)}
            className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface/80 px-mca-compact py-mca-tight text-mca-body text-mca-ink-strong outline-none transition-all duration-200 ease-mca-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50 dark:border-mca-border-subtle"
          >
            <option value="tcgplayer">TCGPlayer (Name – qty)</option>
            <option value="showdown">Pokémon Showdown (qty Name)</option>
            <option value="txt">Simple (qty× Name)</option>
          </select>
        </div>

        {surfaceError ? (
          <InlineError className="my-mca-compact" showIcon>
            {surfaceError}
          </InlineError>
        ) : null}
        {copyOk && !surfaceError ? (
          <InlineSuccess className="my-mca-compact" showIcon>
            Copied to clipboard.
          </InlineSuccess>
        ) : null}

        <label htmlFor="export-text" className="mt-mca-lg block text-mca-body font-medium text-mca-ink-body">
          List
        </label>
        <textarea
          id="export-text"
          readOnly
          value={loading ? "Loading…" : text}
          className="mca-input mt-mca-sm h-56 w-full resize-y font-mono text-mca-caption leading-relaxed text-mca-body"
        />
      </section>
    </ModalBase>
  );
}
