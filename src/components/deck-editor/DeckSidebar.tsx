"use client";

import type { Database } from "@/lib/supabase/types";
import { useMemo } from "react";

type DeckCardRow = Database["public"]["Tables"]["deck_cards"]["Row"];

export type DeckSidebarCard = DeckCardRow & {
  cardName: string;
};

type Props = {
  deckName: string;
  cards: DeckSidebarCard[];
  focusedKey: string | null;
  onFocusCard: (cardId: string, section: string) => void;
  onAddOne: (cardId: string, section: string) => void;
  onRemoveOne: (cardId: string, section: string) => void;
};

const SECTION_ORDER = ["main", "sideboard", "commander"] as const;

function toKey(cardId: string, section: string): string {
  return `${section}:${cardId}`;
}

export function DeckSidebar({
  deckName,
  cards,
  focusedKey,
  onFocusCard,
  onAddOne,
  onRemoveOne,
}: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, DeckSidebarCard[]>();
    for (const card of cards) {
      const list = map.get(card.section);
      if (list) list.push(card);
      else map.set(card.section, [card]);
    }
    map.forEach((list) => {
      list.sort((a: DeckSidebarCard, b: DeckSidebarCard) =>
        a.cardName.localeCompare(b.cardName)
      );
    });
    return map;
  }, [cards]);

  const totalCards = useMemo(
    () => cards.reduce((acc, card) => acc + card.quantity, 0),
    [cards]
  );

  return (
    <aside className="rounded-mca-card border border-mca-border bg-mca-surface-elevated/50 p-mca-base">
      <h2 className="truncate text-lg font-semibold text-mca-ink-strong">{deckName}</h2>
      <p className="mt-mca-xs text-sm text-mca-ink-muted">{totalCards} total cards</p>

      <div className="mt-mca-base space-y-mca-base">
        {SECTION_ORDER.map((section) => {
          const sectionCards = grouped.get(section) ?? [];
          return (
            <section key={section}>
              <h3 className="mb-mca-sm text-xs font-semibold uppercase tracking-wide text-mca-accent/90">
                {section}
              </h3>
              {sectionCards.length === 0 ? (
                <p className="text-xs text-mca-hint">No cards</p>
              ) : (
                <ul className="space-y-mca-micro">
                  {sectionCards.map((card) => {
                    const key = toKey(card.card_id, card.section);
                    const isFocused = focusedKey === key;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          className={`w-full rounded-mca-block border px-mca-sm py-mca-micro text-left transition ${
                            isFocused
                              ? "border-mca-accent-strong/50 bg-mca-accent-strong/10"
                              : "border-mca-border bg-mca-surface/40 hover:border-mca-border-subtle"
                          }`}
                          onClick={() => onFocusCard(card.card_id, card.section)}
                        >
                          <div className="flex items-center justify-between gap-mca-sm">
                            <p className="truncate text-xs text-mca-ink-soft">
                              {card.cardName}
                            </p>
                            <span className="rounded bg-mca-chrome px-mca-micro py-mca-trace text-[10px] tabular-nums text-mca-ink-body">
                              x{card.quantity}
                            </span>
                          </div>
                          <div className="mt-mca-micro flex gap-mca-xs">
                            <button
                              type="button"
                              className="rounded bg-mca-chrome px-mca-sm py-mca-trace text-xs text-mca-ink-soft hover:bg-mca-border-subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddOne(card.card_id, card.section);
                              }}
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              className="rounded bg-mca-chrome px-mca-sm py-mca-trace text-xs text-mca-ink-soft hover:bg-mca-border-subtle"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveOne(card.card_id, card.section);
                              }}
                            >
                              -1
                            </button>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
