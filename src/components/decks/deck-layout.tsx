"use client";

import { fetchJson, fetchJsonErrorMessage, type FetchJsonResult } from "@/lib/client";
import type { DeckCardEmbedded, DeckCardsBySection } from "@/lib/decks/editor-types";
import { McaIcons } from "@/lib/icons/mca-icons";
import { Icon } from "@/mca-ui/icon";
import { InlineError } from "@/mca-ui/inline-error";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import { useCallback, useMemo, useState } from "react";
import { hoverPreviewHandlers, useCardHoverPreview } from "./card-hover-preview";

const SECTIONS: { id: string; label: string; placeholder?: boolean }[] = [
  { id: "main", label: "Main deck" },
  { id: "sideboard", label: "Side deck" },
  { id: "commander", label: "Brawl", placeholder: true },
];

function thumbFor(row: DeckCardEmbedded): string {
  const c = row.cards;
  return (
    c?.catalog_cards?.image_small ??
    c?.image_url ??
    c?.catalog_cards?.image_large ??
    ""
  );
}

function largeFor(row: DeckCardEmbedded): string {
  const c = row.cards;
  return (
    c?.catalog_cards?.image_large ??
    c?.catalog_cards?.image_small ??
    c?.image_url ??
    ""
  );
}

type Props = {
  deckId: string;
  deckCardsBySection: DeckCardsBySection;
  onDeckUpdated: () => void;
  emptyIllustration?: React.ReactNode;
  className?: string;
};

export function DeckLayout({
  deckId,
  deckCardsBySection,
  onDeckUpdated,
  emptyIllustration,
  className,
}: Props) {
  const preview = useCardHoverPreview();
  const [busy, setBusy] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const totalQty = useMemo(() => {
    let n = 0;
    for (const sec of SECTIONS) {
      for (const r of deckCardsBySection[sec.id] ?? []) {
        n += r.quantity;
      }
    }
    return n;
  }, [deckCardsBySection]);

  const mutate = useCallback(
    async (fn: () => Promise<FetchJsonResult<Record<string, unknown>>>) => {
      const id = `${Date.now()}`;
      setBusy(id);
      setMutationError(null);
      try {
        const r = await fn();
        if (r.kind !== "ok") {
          setMutationError(fetchJsonErrorMessage(r));
          return;
        }
        onDeckUpdated();
      } finally {
        setBusy(null);
      }
    },
    [onDeckUpdated]
  );

  const addOne = (cardId: string, section: string) => {
    void mutate(() =>
      fetchJson("/api/decks/add-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_id: deckId,
          card_id: cardId,
          quantity: 1,
          section,
        }),
      })
    );
  };

  const removeOne = (cardId: string, section: string) => {
    void mutate(() =>
      fetchJson("/api/decks/remove-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck_id: deckId, card_id: cardId, section }),
      })
    );
  };

  const onDragStart = (
    e: React.DragEvent,
    cardId: string,
    section: string,
    quantity: number
  ) => {
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ cardId, section, quantity })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent, targetSection: string) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let parsed: { cardId: string; section: string; quantity: number };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      return;
    }
    if (parsed.section === targetSection) return;
    void mutate(() =>
      fetchJson("/api/decks/move-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deck_id: deckId,
          card_id: parsed.cardId,
          from_section: parsed.section,
          to_section: targetSection,
        }),
      })
    );
  };

  return (
    <section
      aria-live="polite"
      aria-busy={busy !== null}
      className={`flex min-h-[50vh] flex-col rounded-mca-block border border-mca-border bg-mca-surface-elevated/95 shadow-mca-panel dark:border-mca-border-subtle ${className ?? ""}`}
    >
      <div className="border-b border-mca-border px-mca-base py-mca-compact dark:border-mca-border-subtle">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Deck layout
        </h2>
        <p className="mt-mca-sm text-xs text-mca-ink-subtle">
          Drag cards between sections or use + / −. Drops use your deck limits.
        </p>
      </div>

      {mutationError ? (
        <div
          className="border-b border-mca-border px-mca-base py-mca-sm dark:border-mca-border-subtle"
          aria-live="assertive"
        >
          <InlineError>{mutationError}</InlineError>
        </div>
      ) : null}

      {totalQty === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-mca-lg py-mca-stage text-center">
          {emptyIllustration}
          <p className="mt-mca-lg max-w-sm text-sm leading-relaxed text-mca-ink-muted">
            Your deck is empty. Start adding cards from the search panel.
          </p>
        </div>
      ) : (
        <div className="space-y-mca-lg p-mca-base">
          {SECTIONS.map((sec) => (
            <div key={sec.id}>
              <div className="mb-mca-compact flex items-center justify-between gap-mca-compact">
                <h3 className="flex items-center gap-mca-sm text-lg font-semibold text-mca-ink-strong">
                  <Icon src={McaIcons.collection.deck} size="md" alt="" />
                  {sec.label}
                </h3>
                {sec.placeholder ? (
                  <span className="text-[10px] text-mca-hint">
                    Optional · Brawl-style formats
                  </span>
                ) : null}
              </div>
              <div
                className="min-h-[100px] rounded-mca-block border border-dashed border-mca-border-subtle/80 bg-mca-surface/30 p-mca-compact transition-all duration-200 ease-mca-standard hover:border-mca-field-border dark:border-mca-border-subtle/80"
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, sec.id)}
              >
                {sec.placeholder &&
                (deckCardsBySection[sec.id] ?? []).length === 0 ? (
                  <p className="py-mca-xl text-center text-xs text-mca-ink-subtle">
                    Placeholder — drag or add your Brawl Pokémon here for Brawl
                    formats.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-mca-compact sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                    {(deckCardsBySection[sec.id] ?? []).map((row) => {
                      const name = row.cards?.name ?? "Card";
                      const thumb = thumbFor(row);
                      const large = largeFor(row);
                      const ph = hoverPreviewHandlers(
                        preview,
                        large || thumb || null
                      );
                      const key = `${sec.id}-${row.card_id}`;
                      return (
                        <li
                          key={key}
                          draggable
                          onDragStart={(e) =>
                            onDragStart(
                              e,
                              row.card_id,
                              sec.id,
                              row.quantity
                            )
                          }
                          className="group relative overflow-hidden rounded-mca-block border border-mca-border bg-mca-surface-elevated/60 shadow-mca-panel transition-all duration-200 ease-mca-standard hover:border-mca-accent-strong/35 hover:bg-mca-chrome/40 hover:shadow-mca-panel hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.98] dark:border-mca-border-subtle"
                          {...ph}
                        >
                          <div className="relative aspect-[3/4] w-full overflow-hidden bg-mca-surface">
                            {thumb ? (
                              <RemoteCardThumb
                                src={thumb}
                                alt=""
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover transition duration-300 group-hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] text-mca-hint">
                                No art
                              </div>
                            )}
                            <span className="absolute right-1 top-1 rounded-mca-control bg-mca-surface/90 px-mca-micro py-mca-trace text-xs font-bold tabular-nums text-mca-accent">
                              ×{row.quantity}
                            </span>
                          </div>
                          <p className="line-clamp-2 px-mca-sm py-mca-sm text-xs font-medium leading-tight text-mca-ink-soft">
                            {name}
                          </p>
                          <div className="flex gap-mca-sm border-t border-mca-border p-mca-sm dark:border-mca-border-subtle">
                            <button
                              type="button"
                              disabled={busy !== null}
                              onClick={() => addOne(row.card_id, sec.id)}
                              className="flex-1 rounded-mca-control bg-mca-chrome/60 py-mca-micro text-sm font-semibold text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-mca-accent-strong/20 hover:text-mca-nav-accent hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-40"
                              aria-label="Add one"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              disabled={busy !== null}
                              onClick={() => removeOne(row.card_id, sec.id)}
                              className="flex-1 rounded-mca-control bg-mca-chrome/60 py-mca-micro text-sm font-semibold text-mca-ink-soft transition-all duration-200 ease-mca-standard hover:bg-red-950/50 hover:text-red-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 active:scale-[0.97] disabled:opacity-40"
                              aria-label="Remove one"
                            >
                              −
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
