"use client";

import { extractApiErrorMessage, extractApiPayload } from "@/lib/client";
import { mcaLog } from "@/lib/logging/mca-log-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TEL = { componentName: "CreateBinderPage", surfaceName: "binder-create" } as const;

export default function CreateBinderPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [atBinderLimit, setAtBinderLimit] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/tier/status");
      const raw = await res.json().catch(() => ({}));
      const payload = extractApiPayload(raw);
      if (cancelled) return;
      setStatusLoading(false);
      if (res.ok && payload?.at_binder_limit === true) {
        setAtBinderLimit(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (atBinderLimit || statusLoading) {
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a binder name.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/binders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });

    const payload = await res.json().catch(() => ({}));

    setSubmitting(false);

    if (!res.ok) {
      setError(extractApiErrorMessage(payload) ?? "Could not create binder.");
      if (res.status === 403) {
        setAtBinderLimit(true);
      }
      return;
    }

    mcaLog.event("binder.create.success", { nameLen: trimmed.length }, TEL);
    router.push("/binders");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg space-y-mca-xl">
      <h1 className="text-3xl font-semibold tracking-tight text-mca-ink-strong sm:text-4xl">
        Create Binder
      </h1>
      {!atBinderLimit && !statusLoading ? (
        <p className="text-sm leading-relaxed text-mca-ink-muted">
          Your first binder is home base—add pages, fill slots, and open cards from the binder view.
          You can create more binders anytime until you reach your plan limit.
        </p>
      ) : null}

      {atBinderLimit ? (
        <p className="rounded-mca-card border border-mca-warning-surface-border/50 bg-mca-warning-surface/25 px-mca-base py-mca-compact text-sm text-mca-warning-tint">
          You&apos;ve reached your binder limit.
          <Link
            href="/tier"
            className="ms-mca-xs font-semibold text-mca-accent underline-offset-2 hover:underline"
          >
            View plans and upgrade
          </Link>
          .
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-mca-base">
        <div>
          <label
            htmlFor="binder-name"
            className="mb-mca-sm block text-sm font-medium text-mca-ink-body"
          >
            Binder name
          </label>
          <input
            id="binder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            disabled={submitting || atBinderLimit || statusLoading}
            className="mca-input rounded-mca-card px-mca-base py-mca-tight text-sm placeholder:text-mca-ink-subtle disabled:opacity-60"
            placeholder="e.g. Vintage holos"
          />
        </div>

        {error ? (
          <p className="text-sm text-mca-accent" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || atBinderLimit || statusLoading}
          className="rounded-mca-card bg-mca-accent-strong/90 px-mca-comfortable py-mca-tight text-sm font-semibold text-mca-on-accent transition hover:bg-mca-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {statusLoading
            ? "Loading…"
            : submitting
              ? "Creating…"
              : "Submit"}
        </button>
      </form>
    </div>
  );
}
