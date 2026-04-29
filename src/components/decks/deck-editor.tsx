"use client";

import type { DeckRowForAnalytics } from "@/lib/decks/deck-analytics";
import type { DeckEditorPayload } from "@/lib/decks/editor-types";
import { Breadcrumb, NavBackLink } from "@/mca-ui";
import { useCallback, useMemo, useState } from "react";
import { CardHoverPreviewProvider } from "./card-hover-preview";
import { CardSearchPanel } from "./card-search-panel";
import { DeckLayout } from "./deck-layout";
import { DeckStatsPanel } from "./deck-stats-panel";

type Props = {
  deckId: string;
  initial: DeckEditorPayload;
  tierSlug: string;
};

function EmptyDeckArt() {
  return (
    <div
      className="flex h-36 w-full max-w-xs items-center justify-center rounded-mca-block border border-mca-border bg-gradient-to-br from-mca-surface-elevated via-mca-surface to-mca-surface-elevated shadow-mca-panel dark:border-mca-border-subtle"
      aria-hidden="true"
    >
      <svg
        className="h-24 w-24 text-mca-hint"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="34"
          y="12"
          width="74"
          height="94"
          rx="6"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.85"
        />
        <path
          d="M48 38h46M48 52h38"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

export function DeckEditor({ deckId, initial, tierSlug }: Props) {
  const [data, setData] = useState<DeckEditorPayload>(initial);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/decks/${encodeURIComponent(deckId)}`);
    if (!res.ok) return;
    const j = (await res.json()) as DeckEditorPayload;
    setData({
      deck: j.deck,
      deck_stats: j.deck_stats,
      deck_cards_by_section: j.deck_cards_by_section,
    });
  }, [deckId]);

  const deckCardIds = useMemo(() => {
    const s = new Set<string>();
    for (const rows of Object.values(data.deck_cards_by_section)) {
      for (const r of rows) {
        s.add(r.card_id);
      }
    }
    return s;
  }, [data.deck_cards_by_section]);

  const analyticsRows: DeckRowForAnalytics[] = useMemo(() => {
    const sections = ["main", "sideboard", "commander"];
    const out: DeckRowForAnalytics[] = [];
    for (const sec of sections) {
      for (const r of data.deck_cards_by_section[sec] ?? []) {
        out.push({
          quantity: r.quantity,
          cards: r.cards
            ? {
                catalog_cards: r.cards.catalog_cards,
              }
            : null,
        });
      }
    }
    return out;
  }, [data.deck_cards_by_section]);

  return (
    <CardHoverPreviewProvider>
      <div className="space-y-mca-lg">
        <header className="flex flex-col gap-mca-base sm:flex-row sm:items-center sm:justify-between">
          <div>
            <NavBackLink href="/decks">← Your decks</NavBackLink>
            <Breadcrumb
              items={[{ label: "Decks", href: "/decks" }, { label: data.deck.name }]}
              className="mt-mca-xs"
            />
            <h1 className="mt-mca-sm text-2xl font-semibold tracking-tight text-mca-ink-strong">
              {data.deck.name}
            </h1>
            <p className="mt-mca-sm text-sm text-mca-ink-subtle">
              Format:{" "}
              <span className="font-medium text-mca-ink-body">{data.deck.format}</span>
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-mca-lg xl:grid xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,280px)] xl:items-start xl:gap-mca-lg">
          <CardSearchPanel
            deckId={deckId}
            deckCardIds={deckCardIds}
            onDeckUpdated={refresh}
            className="order-1 max-h-[min(420px,70vh)] min-h-0 xl:sticky xl:top-16 xl:max-h-[calc(100vh-5.5rem)]"
          />
          <DeckLayout
            deckId={deckId}
            deckCardsBySection={data.deck_cards_by_section}
            onDeckUpdated={refresh}
            emptyIllustration={<EmptyDeckArt />}
            className="order-2 min-w-0"
          />
          <DeckStatsPanel
            deckId={deckId}
            deckName={data.deck.name}
            stats={data.deck_stats}
            analyticsRows={analyticsRows}
            tierSlug={tierSlug}
            onStatsRefreshed={refresh}
            className="order-3"
          />
        </div>
      </div>
    </CardHoverPreviewProvider>
  );
}
