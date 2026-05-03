"use client";

import { Button } from "@/mca-ui/button";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ShowcaseRow = {
  id: string;
  title: string;
  description: string | null;
  binder_ids: string[];
  featured_card_ids: string[];
  updated_at: string;
};

type BinderRow = { id: string; name: string | null };

export function ShowcaseClient() {
  const [showcases, setShowcases] = useState<ShowcaseRow[]>([]);
  const [binders, setBinders] = useState<BinderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBinders, setSelectedBinders] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, bRes] = await Promise.all([
        fetch("/api/showcases"),
        fetch("/api/binders"),
      ]);
      const sJson = await sRes.json();
      const bJson = await bRes.json();
      if (!sRes.ok) throw new Error(sJson.error ?? "Failed to load showcases");
      if (!bRes.ok) throw new Error(bJson.error ?? "Failed to load binders");
      setShowcases(sJson.showcases ?? []);
      setBinders((bJson.binders ?? []) as BinderRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleBinder = (id: string) => {
    setSelectedBinders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const onCreate = async () => {
    if (!title.trim()) {
      setError("Enter a title.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/showcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          binder_ids: selectedBinders,
          featured_card_ids: [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Create failed");
      setTitle("");
      setDescription("");
      setSelectedBinders([]);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-mca-ink-muted">Loading showcases…</p>;
  }

  return (
    <div className="space-y-mca-xl">
      {error ? (
        <p className="rounded-mca-block border border-mca-error-border/60 bg-mca-error-surface/30 px-mca-md py-mca-sm text-sm text-mca-error-text-strong">
          {error}
        </p>
      ) : null}

      <section className="rounded-mca-card border border-mca-border bg-mca-surface-elevated/50 p-mca-lg">
        <h2 className="text-lg font-semibold text-mca-ink-strong">New showcase</h2>
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
          Curate binders (and later featured cards) into a shareable collection page.
        </p>
        <div className="mt-mca-lg space-y-mca-md">
          <label className="block space-y-mca-xs">
            <span className="text-mca-caption font-medium text-mca-ink-body">Title</span>
            <input
              className="mca-input w-full px-mca-md text-sm text-mca-body"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block space-y-mca-xs">
            <span className="text-mca-caption font-medium text-mca-ink-body">Description</span>
            <textarea
              className="mca-input min-h-[4rem] w-full resize-y px-mca-md text-sm text-mca-body"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div>
            <p className="text-mca-caption font-medium text-mca-ink-body">Binders</p>
            <ul className="mt-mca-sm max-h-48 space-y-mca-xs overflow-y-auto rounded-mca-block border border-mca-border p-mca-sm">
              {binders.length === 0 ? (
                <li className="text-sm text-mca-ink-muted">No binders yet.</li>
              ) : (
                binders.map((b) => (
                  <li key={b.id}>
                    <label className="flex cursor-pointer items-center gap-mca-sm text-sm">
                      <input
                        type="checkbox"
                        checked={selectedBinders.includes(b.id)}
                        onChange={() => toggleBinder(b.id)}
                      />
                      {b.name ?? "Binder"}
                    </label>
                  </li>
                ))
              )}
            </ul>
          </div>
          <Button type="button" disabled={saving} onClick={() => void onCreate()}>
            {saving ? "Creating…" : "Create showcase"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-mca-ink-strong">Your showcases</h2>
        <ul className="mt-mca-md space-y-mca-sm">
          {showcases.length === 0 ? (
            <li className="text-sm text-mca-ink-muted">None yet.</li>
          ) : (
            showcases.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-mca-sm rounded-mca-block border border-mca-border bg-mca-surface-elevated/40 px-mca-md py-mca-sm"
              >
                <div>
                  <p className="font-medium text-mca-ink-strong">{s.title}</p>
                  <p className="text-mca-caption text-mca-ink-muted">
                    {s.binder_ids.length} binder{s.binder_ids.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Link
                  href={`/showcase/${s.id}`}
                  className="text-sm font-semibold text-mca-accent hover:underline"
                >
                  Open
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
