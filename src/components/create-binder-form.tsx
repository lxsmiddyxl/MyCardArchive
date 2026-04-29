"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreateBinderForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/binders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    });
    const json = (await res.json()) as { error?: string; binder?: { id: string } };
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? "Could not create binder.");
      return;
    }
    setName("");
    setDescription("");
    router.refresh();
    if (json.binder?.id) {
      router.push(`/binders/${json.binder.id}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-mca-sheet border border-mca-border-light bg-white p-mca-lg dark:border-mca-border dark:bg-mca-surface"
    >
      <h2 className="text-sm font-medium uppercase tracking-wide text-mca-ink-subtle">
        New binder
      </h2>
      <div className="mt-mca-base space-y-mca-compact">
        <div>
          <label
            htmlFor="binder-name"
            className="block text-xs font-medium text-mca-hint dark:text-mca-ink-muted"
          >
            Name
          </label>
          <input
            id="binder-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-mca-xs w-full rounded-mca-block border border-mca-border-light-strong bg-white px-mca-compact py-mca-sm text-sm dark:border-mca-field-border dark:bg-mca-surface-elevated dark:text-mca-ink-strong"
            placeholder="e.g. Base Set 1999"
          />
        </div>
        <div>
          <label
            htmlFor="binder-desc"
            className="block text-xs font-medium text-mca-hint dark:text-mca-ink-muted"
          >
            Description (optional)
          </label>
          <input
            id="binder-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-mca-xs w-full rounded-mca-block border border-mca-border-light-strong bg-white px-mca-compact py-mca-sm text-sm dark:border-mca-field-border dark:bg-mca-surface-elevated dark:text-mca-ink-strong"
          />
        </div>
      </div>
      {error && (
        <p className="mt-mca-compact text-sm text-mca-accent-deep dark:text-mca-accent">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-mca-base rounded-mca-block bg-mca-surface-elevated px-mca-base py-mca-sm text-sm font-medium text-white disabled:opacity-50 dark:bg-mca-surface-paper dark:text-mca-surface-elevated"
      >
        {loading ? "Creating…" : "Create binder"}
      </button>
    </form>
  );
}
