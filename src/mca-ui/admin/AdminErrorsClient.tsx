"use client";

import { useEffect, useState } from "react";

type ErrorSummary = {
  generatedAt: string;
  total: number;
  byRoute: { route: string; count: number; severity: string }[];
  recent: { route: string; message: string; severity: string; ts: string }[];
};

export function AdminErrorsClient() {
  const [data, setData] = useState<ErrorSummary | null>(null);

  useEffect(() => {
    void fetch("/analytics/errors/summary.json", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return <p className="text-mca-sm text-mca-ink-muted">Loading error summary…</p>;
  }

  return (
    <div className="space-y-mca-xl">
      <p className="text-mca-sm text-mca-ink-muted">
        Generated {new Date(data.generatedAt).toLocaleString()} · {data.total} events
      </p>
      <section>
        <h2 className="text-mca-lg font-semibold text-mca-ink-strong">By route</h2>
        <ul className="mt-mca-md space-y-mca-sm">
          {data.byRoute.map((r) => (
            <li
              key={r.route}
              className="flex justify-between rounded-mca-control border border-mca-border px-mca-base py-mca-sm text-mca-sm"
            >
              <span className="font-mono text-mca-ink-muted">{r.route}</span>
              <span>
                {r.count} · {r.severity}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-mca-lg font-semibold text-mca-ink-strong">Recent</h2>
        <ul className="mt-mca-md space-y-mca-sm">
          {data.recent.map((e, i) => (
            <li
              key={`${e.route}-${i}`}
              className="rounded-mca-control border border-mca-border px-mca-base py-mca-sm text-mca-sm"
            >
              <p className="font-mono text-mca-ink-subtle">{e.route}</p>
              <p className="text-mca-ink-muted">{e.message}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
