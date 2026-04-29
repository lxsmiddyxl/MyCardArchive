"use client";

import { LoadingSpinner } from "@/mca-ui/loading-button";
import type { Database } from "@/lib/supabase/types";
import { useEffect, useMemo, useState } from "react";

type CatalogCardRow = Database["public"]["Tables"]["catalog_cards"]["Row"];

export type CatalogSearchFilters = {
  query: string;
  type: string;
  rarity: string;
  setId: string;
};

type Props = {
  catalogCards: CatalogCardRow[];
  value: CatalogSearchFilters;
  onChange: (next: CatalogSearchFilters, filtered: CatalogCardRow[]) => void;
};

export function CatalogSearch({ catalogCards, value, onChange }: Props) {
  const [queryDraft, setQueryDraft] = useState(value.query);
  const [filterPending, setFilterPending] = useState(false);

  useEffect(() => {
    setQueryDraft(value.query);
  }, [value.query]);

  useEffect(() => {
    const pending = queryDraft.trim() !== value.query.trim();
    if (!pending) {
      setFilterPending(false);
      return;
    }
    setFilterPending(true);
    const t = window.setTimeout(() => setFilterPending(false), 280);
    return () => window.clearTimeout(t);
  }, [queryDraft, value.query]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = { ...value, query: queryDraft.trim() };
      const filtered = applyFilters(catalogCards, next);
      onChange(next, filtered);
    }, 280);
    return () => window.clearTimeout(t);
  }, [catalogCards, onChange, queryDraft, value]);

  const rarities = useMemo(() => {
    const s = new Set<string>();
    for (const c of catalogCards) if (c.rarity) s.add(c.rarity);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [catalogCards]);

  const types = useMemo(() => {
    const s = new Set<string>();
    for (const c of catalogCards) if (c.supertype) s.add(c.supertype);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [catalogCards]);

  const sets = useMemo(() => {
    const s = new Set<string>();
    for (const c of catalogCards) s.add(c.set_id);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [catalogCards]);

  const patchFilters = (patch: Partial<CatalogSearchFilters>) => {
    const next = { ...value, ...patch };
    const filtered = applyFilters(catalogCards, next);
    onChange(next, filtered);
  };

  const filteredPreview = useMemo(
    () => applyFilters(catalogCards, { ...value, query: queryDraft.trim() }),
    [catalogCards, value, queryDraft]
  );

  return (
    <section className="rounded-mca-card border border-mca-border bg-mca-surface-elevated/50 p-mca-base">
      <div className="grid grid-cols-1 gap-mca-sm md:grid-cols-4">
        <div className="relative">
          <input
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
            placeholder="Search cards..."
            className="w-full rounded-mca-block border border-mca-border-subtle bg-mca-surface px-mca-compact py-mca-sm pe-9 text-sm text-mca-ink-strong outline-none"
          />
          {filterPending ? (
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <LoadingSpinner className="size-4 text-mca-accent/85" />
            </span>
          ) : null}
        </div>
        <select
          value={value.type}
          onChange={(e) => patchFilters({ type: e.target.value })}
          className="rounded-mca-block border border-mca-border-subtle bg-mca-surface px-mca-sm py-mca-sm text-sm text-mca-ink-soft"
        >
          <option value="">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={value.rarity}
          onChange={(e) => patchFilters({ rarity: e.target.value })}
          className="rounded-mca-block border border-mca-border-subtle bg-mca-surface px-mca-sm py-mca-sm text-sm text-mca-ink-soft"
        >
          <option value="">All rarities</option>
          {rarities.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={value.setId}
          onChange={(e) => patchFilters({ setId: e.target.value })}
          className="rounded-mca-block border border-mca-border-subtle bg-mca-surface px-mca-sm py-mca-sm text-sm text-mca-ink-soft"
        >
          <option value="">All sets</option>
          {sets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {!filterPending &&
      queryDraft.trim().length > 0 &&
      filteredPreview.length === 0 ? (
        <p className="mt-mca-compact text-sm text-mca-ink-subtle">No cards match these filters.</p>
      ) : null}
    </section>
  );
}

function applyFilters(cards: CatalogCardRow[], filters: CatalogSearchFilters) {
  const q = filters.query.trim().toLowerCase();
  return cards.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    if (filters.type && (c.supertype ?? "") !== filters.type) return false;
    if (filters.rarity && (c.rarity ?? "") !== filters.rarity) return false;
    if (filters.setId && c.set_id !== filters.setId) return false;
    return true;
  });
}
