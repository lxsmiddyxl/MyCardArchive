"use client";

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

      const res = await fetch("/api/scan", {
        method: "POST",
        body,
      });

      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        card?: ParsedCard;
      };

      if (!res.ok || !json.ok || !json.card) {
        setError(json.error ?? "Scan failed.");
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
    <div className="space-y-mca-lg">
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
          className="mt-mca-sm block w-full text-sm text-mca-hint file:mr-mca-base file:rounded-mca-block file:border-0 file:bg-mca-surface-elevated file:px-mca-base file:py-mca-sm file:text-sm file:font-medium file:text-white dark:text-mca-ink-muted dark:file:bg-mca-surface-paper dark:file:text-mca-surface-elevated"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-mca-base rounded-mca-block bg-mca-surface-elevated px-mca-base py-mca-tight text-sm font-medium text-white transition hover:bg-mca-chrome disabled:opacity-50 dark:bg-mca-surface-paper dark:text-mca-surface-elevated dark:hover:bg-mca-border-light"
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
    </div>
  );
}
