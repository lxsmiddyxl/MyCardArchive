"use client";

import { fetchJson } from "@/lib/client";
import type { MarketCatalogPreviewPayloadDTO } from "@/lib/dto/market";
import { useEffect, useMemo, useRef, useState } from "react";

type Item = { catalog_card_id: string; qty: number };

type CardRow = {
  id: string;
  name: string;
  number?: string | null;
  image_small?: string | null;
  rarity?: string | null;
};

function collectIds(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const row of items) {
    if (row && typeof row === "object" && "catalog_card_id" in row) {
      const id = (row as { catalog_card_id?: string }).catalog_card_id;
      if (typeof id === "string" && id.length > 0) out.push(id);
    }
  }
  return out;
}

export function CatalogOfferPreviews({ itemsOffered, itemsRequested }: { itemsOffered: unknown; itemsRequested: unknown }) {
  const ids = useMemo(() => {
    const a = [...new Set([...collectIds(itemsOffered), ...collectIds(itemsRequested)])];
    return a.slice(0, 24);
  }, [itemsOffered, itemsRequested]);

  const [cards, setCards] = useState<Record<string, CardRow>>({});
  const [loading, setLoading] = useState(false);
  const fetchSeq = useRef(0);

  useEffect(() => {
    if (ids.length === 0) return;
    const seq = ++fetchSeq.current;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const r = await fetchJson<MarketCatalogPreviewPayloadDTO>(
        `/api/market/catalog-preview?ids=${encodeURIComponent(ids.join(","))}`,
        { cache: "no-store" }
      );
      if (cancelled || seq !== fetchSeq.current) return;
      if (r.kind !== "ok") {
        setLoading(false);
        return;
      }
      if (r.data.cards) setCards(r.data.cards);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [ids]);

  if (ids.length === 0) return null;

  return (
    <section
      className="mt-mca-sm flex flex-wrap gap-mca-sm"
      aria-live="polite"
      aria-busy={loading}
    >
      {ids.map((id) => {
        const c = cards[id];
        return (
          <div
            key={id}
            className="flex max-w-[8rem] flex-col gap-mca-trace rounded-mca-control border border-mca-border/80 bg-mca-chrome/30 p-mca-xs"
          >
            {c?.image_small ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image_small} alt="" className="h-16 w-full rounded-mca-control object-contain" />
            ) : (
              <div className="flex h-16 items-center justify-center text-mca-caption text-mca-ink-subtle">…</div>
            )}
            <p className="line-clamp-2 text-mca-caption text-mca-ink-body">{c?.name ?? id.slice(0, 8) + "…"}</p>
          </div>
        );
      })}
    </section>
  );
}
