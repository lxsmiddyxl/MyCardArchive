"use client";

import type { Database } from "@/lib/supabase/types";
import { useMemo, useState } from "react";

type CatalogCardRow = Database["public"]["Tables"]["catalog_cards"]["Row"];

type Props = {
  cards: CatalogCardRow[];
  onAddCard: (cardId: string) => void;
};

const PAGE_SIZE = 24;

export function CardGrid({ cards, onAddCard }: Props) {
  const [page, setPage] = useState(1);
  const [hoverCardId, setHoverCardId] = useState<string | null>(null);

  const pages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);

  const pageCards = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return cards.slice(start, start + PAGE_SIZE);
  }, [cards, safePage]);

  const hovered = useMemo(
    () => cards.find((c) => c.id === hoverCardId) ?? null,
    [cards, hoverCardId]
  );

  return (
    <section className="relative rounded-mca-card border border-mca-border bg-mca-surface-elevated/50 p-mca-base">
      <div className="mb-mca-compact flex items-center justify-between">
        <p className="text-xs text-mca-ink-subtle">
          Showing {pageCards.length} of {cards.length}
        </p>
        <div className="flex items-center gap-mca-sm text-xs">
          <button
            type="button"
            disabled={safePage <= 1}
            className="rounded border border-mca-border-subtle px-mca-sm py-mca-xs disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-mca-ink-muted">
            {safePage}/{pages}
          </span>
          <button
            type="button"
            disabled={safePage >= pages}
            className="rounded border border-mca-border-subtle px-mca-sm py-mca-xs disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-mca-compact sm:grid-cols-3 xl:grid-cols-4">
        {pageCards.map((card) => (
          <article
            key={card.id}
            className="group rounded-mca-block border border-mca-border bg-mca-surface/60 p-mca-sm transition hover:border-mca-accent-strong/30"
            onMouseEnter={() => setHoverCardId(card.id)}
            onMouseLeave={() => setHoverCardId(null)}
          >
            <div className="mb-mca-xs flex items-center justify-between gap-mca-sm">
              <p className="truncate text-xs text-mca-ink-soft">{card.name}</p>
              <span className="text-[10px] text-mca-ink-subtle">{card.rarity ?? "—"}</span>
            </div>
            <p className="mb-mca-sm text-[10px] text-mca-hint">{card.set_id}</p>
            <button
              type="button"
              className="w-full rounded bg-mca-accent-strong/90 px-mca-sm py-mca-xs text-xs font-semibold text-mca-on-accent hover:bg-mca-accent"
              onClick={() => onAddCard(card.id)}
            >
              Add to deck
            </button>
          </article>
        ))}
      </div>

      {hovered ? (
        <div className="pointer-events-none absolute right-3 top-3 hidden w-56 rounded-mca-block border border-mca-border-subtle bg-mca-surface/95 p-mca-sm shadow-mca-card xl:block">
          <p className="truncate text-sm font-medium text-mca-ink-strong">{hovered.name}</p>
          <p className="mt-mca-xs text-xs text-mca-ink-subtle">{hovered.supertype ?? "Unknown type"}</p>
          {hovered.image_large || hovered.image_small ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hovered.image_large ?? hovered.image_small ?? ""}
              alt=""
              className="mt-mca-sm max-h-72 w-full rounded object-contain"
            />
          ) : (
            <div className="mt-mca-sm flex h-40 items-center justify-center rounded bg-mca-surface-elevated text-xs text-mca-hint">
              No preview image
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
