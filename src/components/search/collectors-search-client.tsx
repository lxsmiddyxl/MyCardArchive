"use client";

import { MiniActivityStrip } from "@/components/activity/mini-activity-strip";
import { getInfluenceDimensionById } from "@/lib/influence/influence-catalog";
import { getReputationDimensionById } from "@/lib/reputation/reputation-catalog";
import { InlineUserFlair } from "@/components/flair/inline-user-flair";
import { TrainerPresenceDot } from "@/components/presence/trainer-presence-dot";
import type { CollectorSearchFilters } from "@/lib/search/search-filters";
import {
  emptyFilters,
  parseFiltersFromQuery,
  serializeFiltersForQuery,
} from "@/lib/search/search-filters";
import type { SocialPresenceSnapshot } from "@/lib/social/types";
import { cn } from "@/lib/ui/cn";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type OptionsPayload = {
  playFormats: { id: string; label: string }[];
  playArchetypes: { id: string; label: string }[];
  fandomEras: { id: string; label: string }[];
  clubs: { id: string; label: string }[];
  journeys: { id: string; label: string }[];
  seasonalEventIds: string[];
  presenceStates: { id: string; label: string }[];
  valueBands: { id: number; label: string }[];
  tradeTiers: { id: number; label: string }[];
  rarityProfiles: { id: string; label: string }[];
};

export type SearchResultRow = {
  userId: string;
  rankScore: number;
  similarityScore: number | null;
  personaText: string | null;
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  presence: SocialPresenceSnapshot | null;
  primaryClubLabel: string | null;
  sharedClubsSummary: string | null;
  activityHeatmapStrip?: number[];
  topFlairKey: string | null;
  topSeasonalFlairKey: string | null;
  reputationSummary?: string | null;
  reputationDimensionChips?: string[];
  influenceSummary?: string | null;
  influenceDimensionChips?: string[];
};

export function CollectorsSearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const initialFilters = useMemo(
    () => parseFiltersFromQuery(params.get("filters")),
    [params]
  );

  const [filters, setFilters] = useState<CollectorSearchFilters>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<CollectorSearchFilters>(initialFilters);
  const [options, setOptions] = useState<OptionsPayload | null>(null);
  const [results, setResults] = useState<SearchResultRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedFilters(filters), 380);
    return () => window.clearTimeout(t);
  }, [filters]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/search/options", { cache: "no-store" });
        const body = (await res.json()) as OptionsPayload & { error?: string };
        if (res.ok) setOptions(body);
      } catch {
        setOptions(null);
      }
    })();
  }, []);

  const syncUrl = useCallback(
    (f: CollectorSearchFilters) => {
      const encoded = serializeFiltersForQuery(f);
      const qs = encoded === "{}" ? "" : `?filters=${encodeURIComponent(encoded)}`;
      router.replace(`/search/collectors${qs}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    syncUrl(debouncedFilters);
  }, [debouncedFilters, syncUrl]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const encoded = serializeFiltersForQuery(debouncedFilters);
        const qs =
          encoded !== "{}"
            ? `filters=${encodeURIComponent(encoded)}&limit=36&offset=0`
            : `limit=36&offset=0`;
        const res = await fetch(`/api/search/collectors?${qs}`, { cache: "no-store" });
        const body = (await res.json()) as { results?: SearchResultRow[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Search failed");
        if (!cancelled) setResults(body.results ?? []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedFilters]);

  const reset = () => {
    setFilters(emptyFilters());
  };

  const sel = (key: keyof CollectorSearchFilters, val: string | number | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (val === "" || val === undefined) {
        delete next[key];
      } else {
        (next as Record<string, unknown>)[key as string] = val;
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-mca-lg lg:flex-row lg:items-start">
      <aside className="lg:w-72 lg:shrink-0">
        <Panel className="border-mca-border bg-mca-surface-elevated/50 p-mca-md">
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Filters
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
            Coarse identity bands only — no financial precision or private card fields.
          </p>
          <div className="mt-mca-md space-y-mca-md">
            <Field id="search-filter-persona" label="Persona keywords">
              <input
                id="search-filter-persona"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.personaQuery ?? ""}
                onChange={(e) => sel("personaQuery", e.target.value)}
                placeholder="Try play style, era, favorite Pokémon…"
              />
            </Field>
            <Field id="search-filter-play-format" label="Play format">
              <select
                id="search-filter-play-format"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.playFormatId ?? ""}
                onChange={(e) => sel("playFormatId", e.target.value)}
              >
                <option value="">Any</option>
                {(options?.playFormats ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="search-filter-archetype" label="Archetype">
              <select
                id="search-filter-archetype"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.playArchetypeId ?? ""}
                onChange={(e) => sel("playArchetypeId", e.target.value)}
              >
                <option value="">Any</option>
                {(options?.playArchetypes ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="search-filter-fandom-era" label="Fandom era">
              <select
                id="search-filter-fandom-era"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.fandomEraId ?? ""}
                onChange={(e) => sel("fandomEraId", e.target.value)}
              >
                <option value="">Any</option>
                {(options?.fandomEras ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="search-filter-club" label="Club">
              <select
                id="search-filter-club"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.clubIds?.[0] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilters((prev) => {
                    const next = { ...prev };
                    if (!v) delete next.clubIds;
                    else next.clubIds = [v];
                    return next;
                  });
                }}
              >
                <option value="">Any</option>
                {(options?.clubs ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="search-filter-presence" label="Presence">
              <select
                id="search-filter-presence"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.presenceState ?? ""}
                onChange={(e) => sel("presenceState", e.target.value)}
              >
                <option value="">Any</option>
                {(options?.presenceStates ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="search-filter-active-within" label="Active within (days)">
              <input
                id="search-filter-active-within"
                type="number"
                min={1}
                max={365}
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.activeWithinDaysMax ?? ""}
                onChange={(e) =>
                  sel(
                    "activeWithinDaysMax",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                placeholder="e.g. 7"
              />
            </Field>
            <Field id="search-filter-min-events-7d" label="Min events (7d)">
              <input
                id="search-filter-min-events-7d"
                type="number"
                min={0}
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.minEventsLast7Days ?? ""}
                onChange={(e) =>
                  sel(
                    "minEventsLast7Days",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              />
            </Field>
            <Field id="search-filter-value-band" label="Value band (min)">
              <select
                id="search-filter-value-band"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.valueBandMin ?? ""}
                onChange={(e) =>
                  sel(
                    "valueBandMin",
                    e.target.value === "" ? undefined : (Number(e.target.value) as 0 | 1 | 2 | 3 | 4)
                  )
                }
              >
                <option value="">Any</option>
                {(options?.valueBands ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="search-filter-trade-tier" label="Trade tier (min)">
              <select
                id="search-filter-trade-tier"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.tradeTierMin ?? ""}
                onChange={(e) =>
                  sel(
                    "tradeTierMin",
                    e.target.value === "" ? undefined : (Number(e.target.value) as 0 | 1 | 2 | 3)
                  )
                }
              >
                <option value="">Any</option>
                {(options?.tradeTiers ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="search-filter-rarity-profile" label="Rarity profile">
              <select
                id="search-filter-rarity-profile"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.rarityProfile ?? ""}
                onChange={(e) => sel("rarityProfile", e.target.value)}
              >
                <option value="">Any</option>
                {(options?.rarityProfiles ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="search-filter-journey" label="Journey completed">
              <select
                id="search-filter-journey"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.completedJourneyIds?.[0] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilters((prev) => {
                    const next = { ...prev };
                    if (!v) delete next.completedJourneyIds;
                    else next.completedJourneyIds = [v];
                    return next;
                  });
                }}
              >
                <option value="">Any</option>
                {(options?.journeys ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="search-filter-seasonal" label="Seasonal badge">
              <select
                id="search-filter-seasonal"
                className="w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-sm py-mca-xs text-mca-caption"
                value={filters.seasonalEventIds?.[0] ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilters((prev) => {
                    const next = { ...prev };
                    if (!v) delete next.seasonalEventIds;
                    else next.seasonalEventIds = [v];
                    return next;
                  });
                }}
              >
                <option value="">Any</option>
                {(options?.seasonalEventIds ?? []).map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="button" variant="tertiary" className="w-full" onClick={reset}>
              Clear filters
            </Button>
          </div>
        </Panel>
      </aside>

      <section className="min-w-0 flex-1 space-y-mca-md">
        <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
          <h2 className="text-lg font-semibold text-mca-ink-strong">Results</h2>
          <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
            Rank blends similarity (when signed in), shared clubs, overlapping identity pins, and recent
            activity — never value alone.
          </p>
          {error ? (
            <p className="mt-mca-md text-mca-caption text-mca-error-accent" role="alert">
              {error}
            </p>
          ) : null}
          {loading ? (
            <p className="mt-mca-md text-mca-body text-mca-ink-muted">Searching…</p>
          ) : results.length === 0 ? (
            <p className="mt-mca-md text-mca-body text-mca-ink-muted">
              No collectors match yet — broaden filters or check back after profiles sync.
            </p>
          ) : (
            <ul className="mt-mca-md grid gap-mca-md sm:grid-cols-2">
              {results.map((r) => (
                <li key={r.userId}>
                  <Panel className="h-full border border-mca-border/80 bg-mca-surface-elevated/40 p-mca-md">
                    <div className="flex gap-mca-sm">
                      <Link
                        href={`/profile/${encodeURIComponent(r.userId)}`}
                        className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-mca-border bg-mca-chrome"
                      >
                        {r.avatarUrl ? (
                          <Image
                            src={r.avatarUrl}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized={r.avatarUrl.startsWith("data:")}
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-mca-caption">
                            —
                          </span>
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-mca-xs">
                          <Link
                            href={`/profile/${encodeURIComponent(r.userId)}`}
                            className="truncate font-semibold text-mca-ink-strong hover:underline"
                          >
                            {r.displayName?.trim() ||
                              (r.username?.trim() ? `@${r.username.trim()}` : null) ||
                              "Trainer"}
                          </Link>
                          {r.presence ? (
                            <TrainerPresenceDot
                              lastSeenAt={r.presence.lastSeenAt}
                              lastActivityAt={r.presence.lastActivityAt}
                              lastActivityKey={r.presence.lastActivityKey}
                              presenceOptOut={r.presence.optedOut}
                            />
                          ) : null}
                          <InlineUserFlair
                            flairKey={r.topFlairKey}
                            secondaryFlairKey={r.topSeasonalFlairKey}
                          />
                        </div>
                        {r.personaText?.trim() ? (
                          <p className="mt-mca-trace line-clamp-2 text-mca-caption text-mca-ink-subtle">
                            {r.personaText.trim()}
                          </p>
                        ) : null}
                        {r.reputationSummary?.trim() ? (
                          <p className="mt-mca-trace text-[11px] text-mca-ink-body">{r.reputationSummary.trim()}</p>
                        ) : null}
                        {r.influenceSummary?.trim() ? (
                          <p className="mt-mca-trace text-[11px] text-mca-accent-strong/90">{r.influenceSummary.trim()}</p>
                        ) : null}
                        {r.reputationDimensionChips && r.reputationDimensionChips.length > 0 ? (
                          <div className="mt-mca-xs flex flex-wrap gap-mca-xs">
                            {r.reputationDimensionChips.map((id) => {
                              const d = getReputationDimensionById(id);
                              if (!d) return null;
                              return (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-mca-micro rounded-full border border-mca-border/60 bg-mca-surface/50 px-mca-xs py-0.5 text-[10px] font-medium text-mca-ink-muted"
                                >
                                  <span aria-hidden>{d.icon}</span>
                                  {d.displayName}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                        {r.influenceDimensionChips && r.influenceDimensionChips.length > 0 ? (
                          <div className="mt-mca-xs flex flex-wrap gap-mca-xs">
                            {r.influenceDimensionChips.map((id) => {
                              const d = getInfluenceDimensionById(id);
                              if (!d) return null;
                              return (
                                <span
                                  key={id}
                                  className="inline-flex items-center gap-mca-micro rounded-full border border-mca-accent/40 bg-mca-accent/10 px-mca-xs py-0.5 text-[10px] font-medium text-mca-ink-body"
                                >
                                  <span aria-hidden>{d.icon}</span>
                                  {d.displayName}
                                </span>
                              );
                            })}
                          </div>
                        ) : null}
                        {r.primaryClubLabel ? (
                          <p className="mt-mca-xs text-mca-caption text-mca-accent-strong/90">
                            Primary club · {r.primaryClubLabel}
                          </p>
                        ) : null}
                        {r.sharedClubsSummary ? (
                          <p className="mt-mca-trace text-[11px] text-mca-ink-muted">
                            {r.sharedClubsSummary}
                          </p>
                        ) : null}
                        {typeof r.similarityScore === "number" ? (
                          <p className="mt-mca-xs text-mca-caption tabular-nums text-mca-ink-muted">
                            Similarity · {Math.round(r.similarityScore)}
                          </p>
                        ) : null}
                        {r.activityHeatmapStrip && r.activityHeatmapStrip.length > 0 ? (
                          <MiniActivityStrip counts={r.activityHeatmapStrip} className="mt-mca-sm max-w-[220px]" />
                        ) : null}
                      </div>
                    </div>
                  </Panel>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>
    </div>
  );
}
