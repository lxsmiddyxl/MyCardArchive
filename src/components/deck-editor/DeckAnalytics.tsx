"use client";

import type { Database } from "@/lib/supabase/types";
import { useMemo } from "react";

type DeckCardRow = Database["public"]["Tables"]["deck_cards"]["Row"];
type CatalogCardRow = Database["public"]["Tables"]["catalog_cards"]["Row"];
type CardPriceRow = Database["public"]["Tables"]["card_prices"]["Row"];

type Props = {
  deckCards: DeckCardRow[];
  catalogCards: CatalogCardRow[];
  cardPrices: CardPriceRow[];
};

export function DeckAnalytics({ deckCards, catalogCards, cardPrices }: Props) {
  const catalogById = useMemo(
    () => new Map(catalogCards.map((c) => [c.id, c])),
    [catalogCards]
  );
  const pricesByCardId = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of cardPrices) {
      if (typeof p.market_price === "number") {
        map.set(p.card_id, p.market_price);
      }
    }
    return map;
  }, [cardPrices]);

  const totalCards = useMemo(
    () => deckCards.reduce((acc, c) => acc + c.quantity, 0),
    [deckCards]
  );

  const numberSpread = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0];
    for (const dc of deckCards) {
      const cat = catalogById.get(dc.card_id);
      const label = (cat?.number ?? "").replace(/[^0-9]/g, "");
      const parsed = Number.parseInt(label || "0", 10);
      const bucket = Number.isFinite(parsed) ? Math.min(6, Math.max(0, parsed)) : 0;
      buckets[bucket] += dc.quantity;
    }
    return buckets;
  }, [catalogById, deckCards]);

  const typeDistribution = useMemo(
    () => distribution(deckCards, (c) => catalogById.get(c.card_id)?.supertype ?? "Unknown"),
    [catalogById, deckCards]
  );
  const rarityDistribution = useMemo(
    () => distribution(deckCards, (c) => catalogById.get(c.card_id)?.rarity ?? "Unknown"),
    [catalogById, deckCards]
  );
  const setDistribution = useMemo(
    () => distribution(deckCards, (c) => catalogById.get(c.card_id)?.set_id ?? "Unknown"),
    [catalogById, deckCards]
  );

  const estimatedValue = useMemo(() => {
    let sum = 0;
    for (const dc of deckCards) {
      sum += (pricesByCardId.get(dc.card_id) ?? 0) * dc.quantity;
    }
    return sum;
  }, [deckCards, pricesByCardId]);

  const topCards = useMemo(() => {
    return [...deckCards]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((dc) => ({
        id: dc.card_id,
        name: catalogById.get(dc.card_id)?.name ?? dc.card_id,
        quantity: dc.quantity,
      }));
  }, [catalogById, deckCards]);

  return (
    <aside className="rounded-mca-card border border-mca-border bg-mca-surface-elevated/50 p-mca-base">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-mca-ink-muted">
        Deck analytics
      </h3>
      <p className="mt-mca-xs text-xs text-mca-ink-subtle">Total cards: {totalCards}</p>

      <section className="mt-mca-base">
        <h4 className="text-xs font-medium text-mca-ink-muted">
          Spread by catalog card number
        </h4>
        <p className="mt-mca-trace text-[10px] text-mca-hint">
          Buckets use the card&apos;s number field — not Energy costs.
        </p>
        <div className="mt-mca-sm flex h-24 items-end gap-mca-xs">
          {numberSpread.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-mca-xs">
              <div
                className="w-full rounded-t bg-mca-accent-strong/80"
                style={{ height: `${Math.max(4, v * 6)}px` }}
                title={`${v} cards`}
              />
              <span className="text-[10px] text-mca-hint">{i}</span>
            </div>
          ))}
        </div>
      </section>

      <Distribution title="Type distribution" items={typeDistribution} />
      <Distribution title="Rarity distribution" items={rarityDistribution} />
      <Distribution title="Set distribution" items={setDistribution} limit={6} />

      <section className="mt-mca-base">
        <h4 className="text-xs font-medium text-mca-ink-muted">Estimated value</h4>
        <p className="mt-mca-xs text-lg font-semibold text-mca-ink-strong">
          ${estimatedValue.toFixed(2)}
        </p>
      </section>

      <section className="mt-mca-base">
        <h4 className="text-xs font-medium text-mca-ink-muted">Top cards</h4>
        <ul className="mt-mca-sm space-y-mca-micro">
          {topCards.map((c) => (
            <li key={c.id} className="flex items-center justify-between text-xs">
              <span className="truncate text-mca-ink-body">{c.name}</span>
              <span className="tabular-nums text-mca-ink-subtle">x{c.quantity}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function distribution(
  deckCards: DeckCardRow[],
  toLabel: (c: DeckCardRow) => string
): Array<{ label: string; count: number }> {
  const map = new Map<string, number>();
  for (const card of deckCards) {
    const label = toLabel(card);
    map.set(label, (map.get(label) ?? 0) + card.quantity);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function Distribution({
  title,
  items,
  limit = 5,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
  limit?: number;
}) {
  return (
    <section className="mt-mca-base">
      <h4 className="text-xs font-medium text-mca-ink-muted">{title}</h4>
      <ul className="mt-mca-sm space-y-mca-micro">
        {items.slice(0, limit).map((item) => (
          <li key={item.label} className="flex items-center justify-between text-xs">
            <span className="truncate text-mca-ink-body">{item.label}</span>
            <span className="tabular-nums text-mca-ink-subtle">{item.count}</span>
          </li>
        ))}
        {items.length === 0 ? <li className="text-xs text-mca-hint">No data</li> : null}
      </ul>
    </section>
  );
}
