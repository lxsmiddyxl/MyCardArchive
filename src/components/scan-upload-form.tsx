"use client";

import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { useState } from "react";

type ParsedCard = {
  name: string;
  set: string;
  number: string;
  rarity: string;
  image_url: string;
  notes: string;
};

export function ScanUploadForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedCard | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const form = e.currentTarget;
    const input = form.elements.namedItem("image") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setError("Choose an image file.");
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.append("image", file);

      const r = await fetchJson<{
        ok?: boolean;
        error?: string;
        card?: ParsedCard;
      }>("/api/scan", {
        method: "POST",
        body,
      });
      if (r.kind !== "ok") {
        setError(fetchJsonErrorMessage(r));
        return;
      }
      const json = r.data;
      if (!json.ok || !json.card) {
        setError(typeof json.error === "string" ? json.error : "Scan failed.");
        return;
      }
      setResult(json.card);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-mca-lg" aria-live="polite" aria-busy={loading}>
      <form
        onSubmit={onSubmit}
        className="rounded-mca-sheet border border-dashed border-mca-border-light-strong bg-mca-surface-light/50 p-mca-xl dark:border-mca-field-border dark:bg-mca-surface-elevated/50"
      >
        <label className="block text-sm font-medium text-mca-border-subtle dark:text-mca-ink-body">
          Card photo
        </label>
        <input
          name="image"
          type="file"
          accept="image/*"
          className="mt-mca-sm block w-full text-sm text-mca-ink-body file:mr-mca-base file:rounded-mca-block file:border file:border-mca-border-subtle file:bg-mca-chrome file:px-mca-base file:py-mca-sm file:text-sm file:font-medium file:text-mca-ink-strong"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-mca-base rounded-mca-block bg-mca-accent-strong/90 px-mca-base py-mca-tight text-sm font-medium text-mca-on-accent shadow-mca-panel transition duration-200 ease-mca-standard hover:bg-mca-accent disabled:opacity-50"
        >
          {loading ? "Scanning…" : "Run mock scan"}
        </button>
      </form>

      {error && (
        <p className="text-sm text-mca-accent-deep dark:text-mca-accent" role="alert">
          {error}
        </p>
      )}

      {result && (
        <div className="rounded-mca-sheet border border-mca-border-light bg-white p-mca-lg dark:border-mca-border dark:bg-mca-surface">
          <h2 className="font-medium text-mca-surface-elevated dark:text-mca-ink">
            Parsed card (mock)
          </h2>
          <dl className="mt-mca-base grid gap-mca-compact text-sm">
            <div>
              <dt className="text-mca-ink-subtle">Name</dt>
              <dd className="font-medium text-mca-surface-elevated dark:text-mca-ink-strong">
                {result.name}
              </dd>
            </div>
            <div>
              <dt className="text-mca-ink-subtle">Set</dt>
              <dd>{result.set}</dd>
            </div>
            <div>
              <dt className="text-mca-ink-subtle">Number</dt>
              <dd>{result.number}</dd>
            </div>
            <div>
              <dt className="text-mca-ink-subtle">Rarity</dt>
              <dd>{result.rarity}</dd>
            </div>
            <div>
              <dt className="text-mca-ink-subtle">Image URL</dt>
              <dd className="break-all text-mca-hint dark:text-mca-ink-muted">
                {result.image_url}
              </dd>
            </div>
            <div>
              <dt className="text-mca-ink-subtle">Notes</dt>
              <dd>{result.notes}</dd>
            </div>
          </dl>
        </div>
      )}
    </section>
  );
}
