"use client";

import type { CatalogCardHit, CatalogSetHit } from "@/lib/dto/catalog";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { Field } from "@/mca-ui/field";
import { Button } from "@/mca-ui/button";
import { Panel } from "@/mca-ui/panel";
import { RemoteCardThumb } from "@/mca-ui/remote-card-thumb";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type CatalogCardSearchClientProps = {
  /** Pre-select a catalog set from `?set_id=` on the search page. */
  initialSetId?: string;
};

type CatalogSetRow = CatalogSetHit;

export function CatalogCardSearchClient({ initialSetId = "" }: CatalogCardSearchClientProps) {
  const [sets, setSets] = useState<CatalogSetRow[]>([]);
  const [setId, setSetId] = useState(initialSetId.trim());
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [hits, setHits] = useState<CatalogCardHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const next = initialSetId.trim();
    if (next) setSetId(next);
  }, [initialSetId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await fetchJson<{ sets: CatalogSetRow[] }>("/api/catalog/sets?limit=120", {
        cache: "no-store",
      });
      if (cancelled) return;
      if (r.kind !== "ok") {
        setSets([]);
        return;
      }
      setSets(Array.isArray(r.data.sets) ? r.data.sets : []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runSearch = useCallback(async () => {
    const q = debounced;
    if (q.length < 1) {
      setHits([]);
      setErr(null);
      return;
    }
    setLoading(true);
    setErr(null);
    const sp = new URLSearchParams({ q, limit: "36" });
    if (setId.trim()) sp.set("set_id", setId.trim());
    const r = await fetchJson<{ results: CatalogCardHit[] }>(
      `/api/catalog/search?${sp.toString()}`,
      { cache: "no-store" }
    );
    if (r.kind !== "ok") {
      setHits([]);
      setErr(fetchJsonErrorMessage(r));
      setLoading(false);
      return;
    }
    setHits(Array.isArray(r.data.results) ? r.data.results : []);
    setLoading(false);
  }, [debounced, setId]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  return (
    <div className="space-y-mca-lg">
      <Panel className="space-y-mca-md rounded-mca-card border border-mca-border bg-mca-surface-elevated/40 p-mca-md">
        <div className="grid gap-mca-md sm:grid-cols-2">
          <Field id="catalog-set-scope" label="Limit to set (optional)">
            <select
              id="catalog-set-scope"
              value={setId}
              onChange={(e) => setSetId(e.target.value)}
              className="mca-input rounded-mca-control px-mca-sm py-mca-sm text-sm text-mca-body"
            >
              <option value="">All sets</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.set_code ? ` (${s.set_code})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field
            id="catalog-card-q"
            label="Card name or number"
            hint="Fuzzy search matches card names, numbers, and set titles when not scoped to one set."
          >
            <input
              id="catalog-card-q"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Charizard, 4, or Jungle"
              autoComplete="off"
              aria-describedby="catalog-card-q-hint"
              className="mca-input rounded-mca-control px-mca-sm py-mca-sm text-sm text-mca-body placeholder:text-mca-hint"
            />
          </Field>
        </div>
        <div className="flex flex-wrap gap-mca-sm">
          <Button type="button" variant="secondary" className="text-xs" onClick={() => void runSearch()}>
            Search again
          </Button>
          <Link
            href="/catalog"
            className="inline-flex items-center rounded-mca-control px-mca-sm py-mca-sm text-xs font-semibold text-mca-accent-strong/90 transition duration-200 ease-mca-standard hover:text-mca-accent"
          >
            Browse sets
          </Link>
        </div>
      </Panel>

      <section
        aria-label="Catalog search results"
        aria-live="polite"
        aria-busy={loading}
        className="space-y-mca-md"
      >
      {err ? (
        <p className="text-mca-caption text-mca-error-accent" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p
          className="text-mca-body text-mca-ink-muted"
          role="status"
        >
          Searching catalog…
        </p>
      ) : null}

      {!loading && debounced.length >= 1 && hits.length === 0 && !err ? (
        <p className="text-mca-body text-mca-ink-muted">No cards matched — try another spelling or clear the set filter.</p>
      ) : null}

      {hits.length > 0 ? (
        <ul
          className="grid grid-cols-1 gap-mca-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          {hits.map((h) => (
            <li key={h.id}>
              <Link
                href={`/catalog/cards/${encodeURIComponent(h.id)}`}
                className="flex gap-mca-md rounded-mca-card border border-mca-border bg-mca-surface-elevated/50 p-mca-md transition duration-200 ease-mca-standard hover:border-mca-field-border hover:bg-mca-chrome/40"
                aria-label={`Open catalog card ${h.name}`}
              >
                <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-mca-control border border-mca-border bg-mca-surface">
                  {h.image_url ? (
                    <RemoteCardThumb
                      src={h.image_url}
                      alt=""
                      sizes="72px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-mca-caption text-mca-hint">—</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-mca-ink-strong">
                    {h.name}{" "}
                    <span className="font-mono text-sm font-normal text-mca-ink-subtle">#{h.number}</span>
                  </p>
                  <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
                    {h.set}
                    {h.rarity ? ` · ${h.rarity}` : ""}
                  </p>
                  <p className="mt-mca-xs font-mono text-[10px] text-mca-hint">{h.id}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      </section>
    </div>
  );
}
