"use client";

import { fetchJson } from "@/lib/client";
import { serializeFiltersForQuery } from "@/lib/search/search-filters";
import type { CollectorSearchFilters } from "@/lib/search/search-filters";
import { cn } from "@/lib/ui/cn";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Suggestion = { kind: keyof CollectorSearchFilters | "clubIds"; id: string; label: string };

function mergeFilterChip(
  prev: CollectorSearchFilters,
  kind: string,
  id: string
): CollectorSearchFilters {
  const next = { ...prev };
  if (kind === "clubIds") {
    const cur = new Set(next.clubIds ?? []);
    cur.add(id);
    next.clubIds = [...cur];
    return next;
  }
  if (kind === "completedJourneyIds") {
    const cur = new Set(next.completedJourneyIds ?? []);
    cur.add(id);
    next.completedJourneyIds = [...cur];
    return next;
  }
  if (kind === "seasonalEventIds") {
    const cur = new Set(next.seasonalEventIds ?? []);
    cur.add(id);
    next.seasonalEventIds = [...cur];
    return next;
  }
  (next as Record<string, string>)[kind] = id;
  return next;
}

export type CollectorQuickSearchProps = {
  className?: string;
  /** When set, navigations include this club as a filter (e.g. on a club detail page). */
  defaultClubId?: string;
};

function mergeDefaultClub(
  filters: CollectorSearchFilters,
  defaultClubId: string | undefined
): CollectorSearchFilters {
  if (!defaultClubId?.trim()) return filters;
  const cur = new Set(filters.clubIds ?? []);
  cur.add(defaultClubId.trim());
  return { ...filters, clubIds: [...cur] };
}

export function CollectorQuickSearch({ className, defaultClubId }: CollectorQuickSearchProps) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [suggestBusy, setSuggestBusy] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), 220);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    if (!debounced) {
      setSuggestions([]);
      return;
    }
    void (async () => {
      setSuggestBusy(true);
      try {
        const r = await fetchJson<{ suggestions: Suggestion[] }>(
          `/api/search/suggest?q=${encodeURIComponent(debounced)}`,
          { cache: "no-store" }
        );
        if (!cancelled && r.kind === "ok") {
          setSuggestions(Array.isArray(r.data.suggestions) ? r.data.suggestions : []);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const runPersonaSearch = useCallback(() => {
    const pq = q.trim();
    if (!pq) return;
    const filters = mergeDefaultClub({ personaQuery: pq }, defaultClubId);
    router.push(`/search/collectors?filters=${encodeURIComponent(serializeFiltersForQuery(filters))}`);
    setOpen(false);
  }, [q, router, defaultClubId]);

  const applySuggestion = useCallback(
    (s: Suggestion) => {
      const base: CollectorSearchFilters = q.trim() ? { personaQuery: q.trim() } : {};
      const merged = mergeDefaultClub(mergeFilterChip(base, s.kind, s.id), defaultClubId);
      router.push(`/search/collectors?filters=${encodeURIComponent(serializeFiltersForQuery(merged))}`);
      setOpen(false);
      setQ("");
    },
    [q, router, defaultClubId]
  );

  const hint = useMemo(
    () => "Search collectors by persona keywords, format, fandom pins, or clubs.",
    []
  );

  return (
    <div className={cn("relative", className)}>
      <Field id="collector-quick-query" label="Find collectors" hint={hint}>
        <div className="flex flex-wrap gap-mca-sm">
          <div
            className="relative min-w-[min(100%,18rem)] flex-1"
            aria-busy={suggestBusy}
          >
            <input
              id="collector-quick-query"
              type="search"
              role="combobox"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runPersonaSearch();
                }
              }}
              placeholder="Persona keywords, or pick a suggestion…"
              className="mca-input rounded-mca-control px-mca-sm py-mca-xs text-mca-body ring-mca-accent-strong focus:ring-2"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-controls="collector-quick-suggestions"
              aria-expanded={open && suggestions.length > 0}
            />
            {open && suggestions.length > 0 ? (
              <ul
                id="collector-quick-suggestions"
                role="listbox"
                aria-label="Search suggestions"
                className="absolute z-50 mt-mca-xs max-h-56 w-full overflow-auto rounded-mca-control border border-mca-border bg-mca-surface-elevated py-mca-xs shadow-mca-panel"
              >
                {suggestions.map((s) => (
                  <li key={`${s.kind}-${s.id}`} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      className="w-full px-mca-sm py-mca-xs text-left text-mca-caption hover:bg-mca-chrome/40"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applySuggestion(s)}
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <Button type="button" variant="secondary" onClick={runPersonaSearch}>
            Search
          </Button>
          <Link
            href="/search/collectors"
            className="inline-flex items-center rounded-mca-control px-mca-sm py-mca-xs text-mca-caption font-medium text-mca-accent-strong hover:underline"
          >
            All filters
          </Link>
        </div>
      </Field>
    </div>
  );
}
