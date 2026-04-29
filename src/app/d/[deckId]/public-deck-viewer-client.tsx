"use client";

import type { PublicDeckPayload } from "@/lib/public-deck/load-public-deck";
import { buildDeckExportDocument } from "@/lib/decks/deck-list-io";
import { useCallback, useState } from "react";

type Props = {
  payload: PublicDeckPayload;
};

function toExportZones(payload: PublicDeckPayload) {
  const map = (rows: PublicDeckPayload["cards"]["main"]) =>
    rows.map((r) => ({ name: r.name, quantity: r.quantity }));
  return {
    main: map(payload.cards.main),
    sideboard: map(payload.cards.sideboard),
    commander: map(payload.cards.commander),
  };
}

export function PublicDeckViewerClient({ payload }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copyText = useCallback(async (label: string, text: string) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2200);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }, []);

  const zones = toExportZones(payload);
  const decklist = buildDeckExportDocument(zones, "txt");
  const digitalPlain = buildDeckExportDocument(zones, "mtgo");
  const textExport = buildDeckExportDocument(zones, "tcgplayer");

  const btn =
    "rounded-mca-control border border-mca-border-light-strong bg-mca-surface-paper px-mca-compact py-mca-sm text-xs font-semibold text-mca-surface-elevated transition-all duration-200 ease-mca-standard hover:opacity-90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-field-border dark:bg-mca-chrome dark:text-mca-ink-strong";

  return (
    <div className="mca-section-reveal mca-section-reveal-delay-2 space-y-mca-compact">
      <p className="text-xs font-semibold uppercase tracking-wide text-mca-ink-subtle dark:text-mca-ink-muted">
        Export
      </p>
      <div className="flex flex-wrap gap-mca-sm">
        <button
          type="button"
          className={btn}
          onClick={() => void copyText("decklist", decklist)}
        >
          {copied === "decklist" ? "Copied" : "Copy decklist"}
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => void copyText("text", textExport)}
        >
          {copied === "text" ? "Copied" : "Export text"}
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => void copyText("digital", digitalPlain)}
        >
          {copied === "digital" ? "Copied" : "Copy digital list"}
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
