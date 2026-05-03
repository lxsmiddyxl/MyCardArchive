"use client";

import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { Button } from "@/mca-ui/button";
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
    const r = await fetchJson<{ binder: { id: string } }>("/api/binders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    });
    setLoading(false);
    if (r.kind !== "ok") {
      setError(fetchJsonErrorMessage(r));
      return;
    }
    setName("");
    setDescription("");
    router.refresh();
    if (r.data.binder?.id) {
      router.push(`/binders/${r.data.binder.id}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-busy={loading}
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
            className="mca-input mt-mca-xs rounded-mca-block"
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
            className="mca-input mt-mca-xs rounded-mca-block"
          />
        </div>
      </div>
      {error && (
        <p className="mt-mca-compact text-sm text-mca-accent-deep dark:text-mca-accent">{error}</p>
      )}
      <Button type="submit" variant="primary" disabled={loading} className="mt-mca-base w-full sm:w-auto">
        {loading ? "Creating…" : "Create binder"}
      </Button>
    </form>
  );
}
