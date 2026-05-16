"use client";

import {
  AdminChartPanel,
  type DashboardConfig,
} from "@/mca-ui/admin/AdminChartPanel";
import { useEffect, useState } from "react";

const DASHBOARDS = [
  "onboarding",
  "binder-interactions",
  "scans",
  "public-views",
] as const;

export function AdminAnalyticsClient() {
  const [configs, setConfigs] = useState<DashboardConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all(
      DASHBOARDS.map(async (id) => {
        const res = await fetch(`/analytics/dashboards/${id}.json`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load ${id}`);
        return (await res.json()) as DashboardConfig;
      })
    )
      .then(setConfigs)
      .catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, []);

  if (error) {
    return <p className="text-mca-sm text-mca-error-accent">{error}</p>;
  }
  if (!configs.length) {
    return <p className="text-mca-sm text-mca-ink-muted">Loading dashboards…</p>;
  }

  return (
    <div className="grid gap-mca-lg lg:grid-cols-2">
      {configs.map((c) => (
        <AdminChartPanel key={c.id} config={c} />
      ))}
    </div>
  );
}
