"use client";

import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import { useCallback, useEffect, useMemo, useState } from "react";

type CatalogRef = {
  id: string;
  name: string;
  number: string;
  set_id: string;
} | null;

type WatchRow = {
  catalog_card_id: string;
  created_at: string;
  catalog_cards?: CatalogRef | CatalogRef[];
};

type Prefs = {
  alert_ft_available: boolean;
  alert_trade_overlap: boolean;
  updated_at: string | null;
};

export function MarketWatchlistPanel() {
  const [items, setItems] = useState<WatchRow[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [addInput, setAddInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [wRes, pRes] = await Promise.all([
        fetch("/api/market/watchlist", { cache: "no-store" }),
        fetch("/api/market/alert-prefs", { cache: "no-store" }),
      ]);
      const wBody = (await wRes.json().catch(() => ({}))) as {
        items?: WatchRow[];
        error?: string;
      };
      const pBody = (await pRes.json().catch(() => ({}))) as {
        prefs?: Prefs;
        error?: string;
      };
      if (!wRes.ok) throw new Error(wBody.error ?? "Failed to load watchlist");
      if (!pRes.ok) throw new Error(pBody.error ?? "Failed to load alert preferences");
      setItems(Array.isArray(wBody.items) ? wBody.items : []);
      if (pBody.prefs) setPrefs(pBody.prefs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onTogglePref = useCallback(
    async (key: "alert_ft_available" | "alert_trade_overlap", next: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/market/alert-prefs", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: next }),
        });
        const body = (await res.json().catch(() => ({}))) as { prefs?: Prefs; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not save preferences");
        if (body.prefs) setPrefs(body.prefs);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const onAdd = useCallback(async () => {
    const id = addInput.trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/market/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalog_card_id: id }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not add");
      setAddInput("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add");
    } finally {
      setBusy(false);
    }
  }, [addInput, load]);

  const onRemove = useCallback(
    async (catalogCardId: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/market/watchlist?catalog_card_id=${encodeURIComponent(catalogCardId)}`,
          { method: "DELETE" }
        );
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not remove");
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not remove");
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const catalogLabel = useMemo(() => {
    return (row: WatchRow) => {
      const c = row.catalog_cards;
      const card = Array.isArray(c) ? c[0] : c;
      if (card?.name) {
        return `${card.name}${card.number ? ` · ${card.number}` : ""}`;
      }
      return row.catalog_card_id;
    };
  }, []);

  if (loading) {
    return (
      <Panel className="border-mca-border bg-mca-surface/40 p-mca-md">
        <p className="text-mca-caption text-mca-ink-muted">Loading watchlist…</p>
      </Panel>
    );
  }

  return (
    <div className="space-y-mca-lg">
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
                className="mt-mca-xs h-4 w-4 shrink-0 rounded border-mca-border text-mca-accent-strong focus:ring-mca-focus/60"
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
                className="mt-mca-xs h-4 w-4 shrink-0 rounded border-mca-border text-mca-accent-strong focus:ring-mca-focus/60"
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
              className="mt-mca-sm w-full rounded-mca-control border border-mca-border bg-mca-surface px-mca-compact py-mca-sm font-mono text-sm text-mca-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-mca-focus/60 dark:border-mca-border-subtle"
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
                  <p className="truncate font-mono text-[10px] text-mca-ink-muted">{row.catalog_card_id}</p>
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
    </div>
  );
}
