"use client";

import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { InviteCodeGenerator } from "@/mca-ui/invites/InviteCodeGenerator";
import { fetchJson, fetchJsonErrorMessage } from "@/lib/client";
import { useCallback, useEffect, useState } from "react";

type UsageStats = {
  total: number;
  used: number;
  unused: number;
};

export function InviteWavePanel() {
  const [count, setCount] = useState(10);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [bulkCodes, setBulkCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetchJson<UsageStats & { success?: boolean }>("/api/invites/usage");
    if (r.kind === "ok") {
      setStats({ total: r.data.total, used: r.data.used, unused: r.data.unused });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function bulkCreate() {
    setLoading(true);
    setMessage(null);
    const r = await fetchJson<{ codes?: { code: string }[]; count?: number }>(
      "/api/invites/bulk",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      }
    );
    setLoading(false);
    if (r.kind !== "ok" || !r.data.codes) {
      setMessage(r.kind !== "ok" ? fetchJsonErrorMessage(r) : "Bulk create failed");
      return;
    }
    setBulkCodes(r.data.codes.map((c) => c.code));
    setMessage(`Created ${r.data.count ?? r.data.codes.length} codes`);
    void refresh();
  }

  function downloadCsv() {
    window.open("/api/invites/usage?format=csv", "_blank");
  }

  const usedPct = stats && stats.total > 0 ? Math.round((stats.used / stats.total) * 100) : 0;

  return (
    <div className="space-y-mca-xl">
      <InviteCodeGenerator />

      <section className="rounded-mca-lg border border-mca-border bg-mca-surface-raised p-mca-lg space-y-mca-md">
        <h2 className="text-mca-lg font-semibold text-mca-ink-strong">Wave #1 bulk generator</h2>
        <Field id="bulk-count" label="Number of codes (max 100)">
          <input
            id="bulk-count"
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mca-input w-32"
          />
        </Field>
        <div className="flex flex-wrap gap-mca-compact">
          <Button type="button" onClick={bulkCreate} disabled={loading}>
            {loading ? "Generating…" : "Generate bulk"}
          </Button>
          <Button type="button" variant="secondary" onClick={downloadCsv}>
            Export CSV
          </Button>
        </div>
        {message ? <p className="text-mca-sm text-mca-ink-muted">{message}</p> : null}
        {bulkCodes.length > 0 ? (
          <textarea
            readOnly
            className="mca-input min-h-[8rem] w-full font-mono text-xs"
            value={bulkCodes.join("\n")}
          />
        ) : null}
      </section>

      {stats ? (
        <section className="rounded-mca-lg border border-mca-border bg-mca-surface-raised p-mca-lg">
          <h2 className="text-mca-lg font-semibold text-mca-ink-strong">Invite health</h2>
          <div className="mt-mca-md grid grid-cols-3 gap-mca-base text-center">
            <div>
              <p className="text-2xl font-bold text-mca-ink-strong">{stats.total}</p>
              <p className="text-mca-xs text-mca-ink-muted">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-mca-success-tint">{stats.used}</p>
              <p className="text-mca-xs text-mca-ink-muted">Redeemed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-mca-ink-strong">{stats.unused}</p>
              <p className="text-mca-xs text-mca-ink-muted">Available</p>
            </div>
          </div>
          <div className="mt-mca-md h-3 rounded-full bg-mca-chrome/60">
            <div
              className="h-3 rounded-full bg-mca-accent/80 transition-all duration-200 ease-mca-standard"
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="mt-mca-micro text-mca-xs text-mca-ink-muted">{usedPct}% redemption rate</p>
        </section>
      ) : null}
    </div>
  );
}
