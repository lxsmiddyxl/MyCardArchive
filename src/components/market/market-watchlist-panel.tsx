"use client";

import {
  fetchJson,
  fetchJsonErrorMessage,
  scheduleCoalescedRouterRefresh,
  useAsyncState,
  useDebouncedSurfaceReload,
} from "@/lib/client";
import type {
  MarketAlertPrefsDTO,
  MarketWatchlistRowDTO,
} from "@/lib/dto/market";
import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import {
  MARKET_SURFACES_REFRESH_EVENT,
  requestMarketSurfacesRefresh,
} from "@/lib/market/market-surfaces-refresh";
import { Panel } from "@/mca-ui/panel";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type WatchlistView = {
  items: MarketWatchlistRowDTO[];
  prefs: MarketAlertPrefsDTO | null;
};

export function MarketWatchlistPanel() {
  const router = useRouter();
  const [addInput, setAddInput] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);

  const { run, data, loading, error: loadError, setData } = useAsyncState<WatchlistView>();
  const {
    run: runAction,
    loading: actionBusy,
    error: actionError,
  } = useAsyncState<null>();

  const load = useCallback(() => {
    return run(async () => {
      const [w, p] = await Promise.all([
        fetchJson<{ items?: MarketWatchlistRowDTO[] }>("/api/market/watchlist", {
          cache: "no-store",
        }),
        fetchJson<{ prefs?: MarketAlertPrefsDTO }>("/api/market/alert-prefs", {
          cache: "no-store",
        }),
      ]);
      if (w.kind !== "ok") throw new Error(fetchJsonErrorMessage(w));
      if (p.kind !== "ok") throw new Error(fetchJsonErrorMessage(p));
      return {
        items: Array.isArray(w.data.items) ? w.data.items : [],
        prefs: p.data.prefs ?? null,
      };
    });
  }, [run]);

  useEffect(() => {
    void load().finally(() => setBootstrapped(true));
  }, [load]);

  const scheduleMarketReload = useDebouncedSurfaceReload(load, 180);

  useEffect(() => {
    const onRefresh = () => scheduleMarketReload();
    window.addEventListener(MARKET_SURFACES_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(MARKET_SURFACES_REFRESH_EVENT, onRefresh);
  }, [scheduleMarketReload]);

  const items = data?.items ?? [];
  const prefs = data?.prefs ?? null;
  const error = loadError ?? actionError;
  const busy = actionBusy;

  const onTogglePref = useCallback(
    async (key: "alert_ft_available" | "alert_trade_overlap", next: boolean) => {
      await runAction(async () => {
        const r = await fetchJson<{ prefs?: MarketAlertPrefsDTO }>("/api/market/alert-prefs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: next }),
        });
        if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
        if (r.data.prefs) {
          setData((d) => (d ? { ...d, prefs: r.data.prefs! } : d));
        }
        requestMarketSurfacesRefresh();
        scheduleCoalescedRouterRefresh(router);
        return null;
      });
    },
    [runAction, setData, router]
  );

  const onAdd = useCallback(async () => {
    const id = addInput.trim();
    if (!id) return;
    await runAction(async () => {
      const r = await fetchJson("/api/market/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalog_card_id: id }),
      });
      if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
      setAddInput("");
      await load();
      requestMarketSurfacesRefresh();
      scheduleCoalescedRouterRefresh(router);
      return null;
    });
  }, [runAction, addInput, load, router]);

  const onRemove = useCallback(
    async (catalogCardId: string) => {
      const prev = data;
      setData((d) =>
        d ? { ...d, items: d.items.filter((x) => x.catalog_card_id !== catalogCardId) } : d
      );
      await runAction(async () => {
        try {
          const r = await fetchJson(
            `/api/market/watchlist?catalog_card_id=${encodeURIComponent(catalogCardId)}`,
            { method: "DELETE" }
          );
          if (r.kind !== "ok") throw new Error(fetchJsonErrorMessage(r));
          await load();
          requestMarketSurfacesRefresh();
          scheduleCoalescedRouterRefresh(router);
          return null;
        } catch (e) {
          setData(prev ?? null);
          throw e;
        }
      });
    },
    [runAction, load, router, data, setData]
  );

  const catalogLabel = useMemo(() => {
    return (row: MarketWatchlistRowDTO) => {
      const c = row.catalog_cards;
      const card = Array.isArray(c) ? c[0] : c;
      if (card?.name) {
        return `${card.name}${card.number ? ` · ${card.number}` : ""}`;
      }
      return row.catalog_card_id;
    };
  }, []);

  if (!bootstrapped) {
    return (
      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <section aria-live="polite" aria-busy>
          <p className="text-mca-caption text-mca-ink-muted">Loading watchlist…</p>
        </section>
      </Panel>
    );
  }

  return (
    <section className="space-y-mca-lg" aria-live="polite" aria-busy={busy}>
      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Alert preferences
        </p>
        <p className="mt-mca-xs text-mca-caption text-mca-hint">
          Control in-app notifications created when watched cards go For trade or when a trade overlap is
          detected with someone you follow.
        </p>
        {prefs ? (
          <div className="mt-mca-md flex flex-col gap-mca-sm">
            <label className="flex cursor-pointer items-start gap-mca-sm text-mca-body text-mca-ink-body">
              <input
                type="checkbox"
                className="mt-mca-xs h-4 w-4 shrink-0 rounded-mca-control border border-mca-border text-mca-accent-strong transition-all duration-200 ease-mca-standard focus:ring-mca-focus/60"
                checked={prefs.alert_ft_available}
                disabled={busy}
                onChange={(e) => void onTogglePref("alert_ft_available", e.target.checked)}
              />
              <span>
                <span className="font-medium text-mca-ink-strong">Watched card listed For trade</span>
                <span className="block text-mca-caption text-mca-ink-muted">
                  Notify when a catalog card on your watchlist is marked For trade by someone else.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-mca-sm text-mca-body text-mca-ink-body">
              <input
                type="checkbox"
                className="mt-mca-xs h-4 w-4 shrink-0 rounded-mca-control border border-mca-border text-mca-accent-strong transition-all duration-200 ease-mca-standard focus:ring-mca-focus/60"
                checked={prefs.alert_trade_overlap}
                disabled={busy}
                onChange={(e) => void onTogglePref("alert_trade_overlap", e.target.checked)}
              />
              <span>
                <span className="font-medium text-mca-ink-strong">Trade overlap on new follows</span>
                <span className="block text-mca-caption text-mca-ink-muted">
                  Notify when you follow (or are followed by) someone with overlapping haves/wants.
                </span>
              </span>
            </label>
          </div>
        ) : null}
      </Panel>

      <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Watchlist
        </p>
        <p className="mt-mca-xs text-mca-caption text-mca-hint">
          Paste a catalog card UUID (from discovery lists or the catalog) to get notified when it appears For
          trade.
        </p>
        <div className="mt-mca-md flex flex-col gap-mca-sm sm:flex-row sm:items-end">
          <Field id="watchlist-catalog-id" label="Catalog card id" className="min-w-0 flex-1">
            <input
              id="watchlist-catalog-id"
              value={addInput}
              onChange={(e) => setAddInput(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
              className="mca-input mt-mca-sm rounded-mca-control font-mono text-sm"
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            disabled={busy || !addInput.trim()}
            onClick={() => void onAdd()}
            className="shrink-0"
          >
            Watch card
          </Button>
        </div>

        {error ? (
          <p className="mt-mca-md text-mca-caption text-mca-error-accent" role="alert">
            {error}
          </p>
        ) : null}

        {items.length === 0 ? (
          <p className="mt-mca-md text-mca-caption text-mca-ink-subtle">No catalog cards on your watchlist.</p>
        ) : (
          <ul className="mt-mca-md space-y-mca-sm">
            {items.map((row) => (
              <li
                key={row.catalog_card_id}
                className="flex flex-wrap items-center justify-between gap-mca-sm rounded-mca-control border border-mca-border/80 bg-mca-surface/50 px-mca-sm py-mca-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-mca-caption text-mca-ink-body">{catalogLabel(row)}</p>
                  <p className="truncate font-mono text-mca-caption text-mca-ink-muted">{row.catalog_card_id}</p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => void onRemove(row.catalog_card_id)}
                  className="shrink-0"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </section>
  );
}
