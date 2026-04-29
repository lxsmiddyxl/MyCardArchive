"use client";

import { Button } from "@/mca-ui/button";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DeckRow = { id: string; name: string | null };
type GuideRow = {
  id: string;
  deck_id: string;
  title: string;
  description: string | null;
  highlights: unknown;
  premium_sections?: unknown;
  analytics_views?: number;
  decks?: { name: string | null; is_public: boolean | null } | null;
};

function premiumJsonNonEmpty(s: string): boolean {
  try {
    const p = JSON.parse(s) as unknown;
    return Array.isArray(p) && p.length > 0;
  } catch {
    return false;
  }
}

export function DeckGuidesClient() {
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [guides, setGuides] = useState<GuideRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deckId, setDeckId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [highlightsText, setHighlightsText] = useState("");
  const [premiumText, setPremiumText] = useState("[]");
  const [saving, setSaving] = useState(false);
  const viewedGuideRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dRes, gRes] = await Promise.all([
        fetch("/api/decks/list"),
        fetch("/api/deck-guides"),
      ]);
      const dJson = await dRes.json();
      const gJson = await gRes.json();
      if (!dRes.ok) throw new Error(dJson.error ?? "Failed to load decks");
      if (!gRes.ok) throw new Error(gJson.error ?? "Failed to load guides");
      setDecks(dJson.decks ?? []);
      setGuides(gJson.guides ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const existingForDeck = useMemo(
    () => guides.find((g) => g.deck_id === deckId),
    [guides, deckId]
  );

  useEffect(() => {
    viewedGuideRef.current = null;
  }, [deckId]);

  useEffect(() => {
    const gid = existingForDeck?.id;
    if (!gid || viewedGuideRef.current === gid) return;
    viewedGuideRef.current = gid;
    void fetch("/api/creator/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "deck_guide_view", guideId: gid }),
    });
  }, [existingForDeck?.id]);

  useEffect(() => {
    if (!deckId) return;
    void (async () => {
      const res = await fetch(`/api/deck-guides?deckId=${encodeURIComponent(deckId)}`);
      const json = await res.json();
      if (!res.ok) return;
      const g = json.guide as GuideRow | null;
      if (g) {
        setTitle(g.title);
        setDescription(g.description ?? "");
        const hl = g.highlights;
        if (Array.isArray(hl)) {
          setHighlightsText(
            hl.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("\n")
          );
        } else {
          setHighlightsText("");
        }
        try {
          setPremiumText(JSON.stringify(g.premium_sections ?? [], null, 2));
        } catch {
          setPremiumText("[]");
        }
      } else {
        setTitle("");
        setDescription("");
        setHighlightsText("");
        setPremiumText("[]");
      }
    })();
  }, [deckId]);

  const onSave = async () => {
    if (!deckId || !title.trim()) {
      setError("Choose a deck and enter a title.");
      return;
    }
    const lines = highlightsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let premium_sections: unknown[] = [];
    try {
      const parsed = JSON.parse(premiumText) as unknown;
      premium_sections = Array.isArray(parsed) ? parsed : [];
    } catch {
      setError("Premium sections must be valid JSON array.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (existingForDeck) {
        const res = await fetch(`/api/deck-guides/${encodeURIComponent(deckId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            highlights: lines,
            premium_sections,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Update failed");
      } else {
        const res = await fetch("/api/deck-guides", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deckId,
            title: title.trim(),
            description: description.trim() || null,
            highlights: lines,
            premium_sections,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Create failed");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-mca-ink-muted" role="status">
        Loading deck guides…
      </p>
    );
  }

  return (
    <div className="space-y-mca-xl">
      {error ? (
        <p className="rounded-mca-block border border-mca-error-border/60 bg-mca-error-surface/30 px-mca-md py-mca-sm text-sm text-mca-error-text-strong">
          {error}
        </p>
      ) : null}

      <section className="rounded-mca-card border border-mca-border bg-mca-surface-elevated/50 p-mca-lg">
        <h2 className="text-lg font-semibold text-mca-ink-strong">
          {existingForDeck ? "Edit deck guide" : "Create deck guide"}
        </h2>
        <p className="mt-mca-sm text-mca-body text-mca-ink-muted">
          One guide per deck. Highlights are shown as bullet lines (strategy, key cards, matchups).
        </p>

        <div className="mt-mca-lg space-y-mca-md">
          <label className="block space-y-mca-xs">
            <span className="text-mca-caption font-medium text-mca-ink-body">Deck</span>
            <select
              className="w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-md py-mca-sm text-sm text-mca-ink-strong"
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
            >
              <option value="">Select a deck…</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name ?? "Untitled deck"}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-mca-xs">
            <span className="text-mca-caption font-medium text-mca-ink-body">Title</span>
            <input
              className="w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-md py-mca-sm text-sm text-mca-ink-strong"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Gardevoir ex — tournament notes"
            />
          </label>

          <label className="block space-y-mca-xs">
            <span className="text-mca-caption font-medium text-mca-ink-body">Description</span>
            <textarea
              className="min-h-[5rem] w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-md py-mca-sm text-sm text-mca-ink-strong"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Overview, tournament results, or deck philosophy."
            />
          </label>

          <label className="block space-y-mca-xs">
            <span className="text-mca-caption font-medium text-mca-ink-body">
              Card highlights (one per line)
            </span>
            <textarea
              className="min-h-[8rem] w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-md py-mca-sm text-sm text-mca-ink-strong"
              value={highlightsText}
              onChange={(e) => setHighlightsText(e.target.value)}
              placeholder={"Iono — turn 2 consistency\nBoss’s Orders — gust outs\n…"}
            />
          </label>

          <label className="block space-y-mca-xs">
            <span className="text-mca-caption font-medium text-mca-ink-body">
              Premium sections (JSON array of {"{ title, body, locked }"})
            </span>
            <textarea
              className="min-h-[6rem] w-full rounded-mca-control border border-mca-field-border bg-mca-surface px-mca-md py-mca-sm font-mono text-mca-caption text-mca-ink-strong"
              value={premiumText}
              onChange={(e) => setPremiumText(e.target.value)}
            />
          </label>
          {existingForDeck && premiumJsonNonEmpty(premiumText) ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                mcaLog.event(
                  "creator.guide.premium_view",
                  { guideId: existingForDeck.id, deckId },
                  { componentName: "DeckGuidesClient", surfaceName: "creator" }
                )
              }
            >
              Preview premium telemetry
            </Button>
          ) : null}

          <Button type="button" disabled={saving} onClick={() => void onSave()}>
            {saving ? "Saving…" : existingForDeck ? "Update guide" : "Create guide"}
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-mca-ink-strong">Your guides</h2>
        <ul className="mt-mca-md space-y-mca-sm">
          {guides.length === 0 ? (
            <li className="text-sm text-mca-ink-muted">No guides yet.</li>
          ) : (
            guides.map((g) => (
              <li
                key={g.id}
                className="rounded-mca-block border border-mca-border bg-mca-surface-elevated/40 px-mca-md py-mca-sm"
              >
                <p className="font-medium text-mca-ink-strong">{g.title}</p>
                <p className="text-mca-caption text-mca-ink-muted">
                  {g.decks?.name ?? "Deck"} {g.decks?.is_public ? "· public deck" : ""}
                  {typeof g.analytics_views === "number" ? ` · ${g.analytics_views} views` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
