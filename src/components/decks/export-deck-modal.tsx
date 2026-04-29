"use client";

import { McaIcons } from "@/lib/icons/mca-icons";
import {
  Icon,
  InlineError,
  InlineSuccess,
  LoadingButton,
  ModalBase,
} from "@/mca-ui";
import { useCallback, useEffect, useState } from "react";

export type DeckExportFormat = "tcgplayer" | "showdown" | "txt";

type Props = {
  open: boolean;
  deckId: string | null;
  onClose: () => void;
};

export function ExportDeckModal({ open, deckId, onClose }: Props) {
  const [format, setFormat] = useState<DeckExportFormat>("tcgplayer");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const [copyBusy, setCopyBusy] = useState(false);

  const loadExport = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    setError(null);
    setCopyOk(false);
    try {
      const res = await fetch(
        `/api/decks/${encodeURIComponent(deckId)}/export?format=${encodeURIComponent(format)}`,
        { cache: "no-store" }
      );
      const bodyText = await res.text();
      if (!res.ok) {
        let msg = bodyText;
        try {
          const j = JSON.parse(bodyText) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* plain text */
        }
        setError(msg || "Export failed");
        setText("");
        return;
      }
      setText(bodyText);
    } catch {
      setError("Network error");
      setText("");
    } finally {
      setLoading(false);
    }
  }, [deckId, format]);

  useEffect(() => {
    if (!open || !deckId) return;
    void loadExport();
  }, [open, deckId, format, loadExport]);

  useEffect(() => {
    if (!open) {
      setFormat("tcgplayer");
      setText("");
      setError(null);
      setCopyOk(false);
      setLoading(false);
      setCopyBusy(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (loading || copyBusy) return;
    setError(null);
    onClose();
  }, [loading, copyBusy, onClose]);

  const copy = useCallback(async () => {
    if (!text) return;
    setCopyBusy(true);
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopyOk(true);
      window.setTimeout(() => setCopyOk(false), 2000);
    } catch {
      setError("Could not copy to clipboard");
    } finally {
      setCopyBusy(false);
    }
  }, [text]);

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
      <p className="text-sm text-mca-ink-subtle">
        Main deck, side deck, and Brawl are separated by blank lines.
      </p>
      <div className="mt-mca-base">
        <label htmlFor="export-format" className="text-sm font-medium text-mca-ink-body">
          Format
        </label>
        <select
          id="export-format"
          value={format}
          disabled={loading || copyBusy}
          onChange={(e) => setFormat(e.target.value as DeckExportFormat)}
          className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface/80 px-mca-compact py-mca-tight text-sm text-mca-ink-strong outline-none transition-all duration-200 ease-mca-standard focus:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 disabled:opacity-50 dark:border-mca-border-subtle"
        >
          <option value="tcgplayer">TCGPlayer (Name – qty)</option>
          <option value="showdown">Pokémon Showdown (qty Name)</option>
          <option value="txt">Simple (qty× Name)</option>
        </select>
      </div>

      {error ? (
        <InlineError className="my-mca-compact" showIcon>
          {error}
        </InlineError>
      ) : null}
      {copyOk && !error ? (
        <InlineSuccess className="my-mca-compact" showIcon>
          Copied to clipboard.
        </InlineSuccess>
      ) : null}

      <label htmlFor="export-text" className="mt-mca-lg block text-sm font-medium text-mca-ink-body">
        List
      </label>
      <textarea
        id="export-text"
        readOnly
        value={loading ? "Loading…" : text}
        className="mt-mca-sm h-56 w-full resize-y rounded-mca-control border border-mca-border bg-mca-surface/80 px-mca-compact py-mca-tight font-mono text-xs leading-relaxed text-mca-ink-strong outline-none transition-all dark:border-mca-border-subtle"
      />
    </ModalBase>
  );
}
