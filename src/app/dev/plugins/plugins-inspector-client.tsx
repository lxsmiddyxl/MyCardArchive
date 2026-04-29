"use client";

import { applyCardMetadataMerge, loadPluginsFromRegistry } from "@/lib/plugins/plugin-loader";
import { DEV_PLUGIN_REGISTRY } from "@/lib/plugins/registry.dev";
import { Panel } from "@/mca-ui/panel";
import { useEffect, useMemo, useState } from "react";

export function PluginsInspectorClient() {
  const [apiPayload, setApiPayload] = useState<unknown>(null);
  const local = useMemo(() => loadPluginsFromRegistry(DEV_PLUGIN_REGISTRY), []);

  const demoMeta = useMemo(
    () =>
      applyCardMetadataMerge(local.plugins, {
        cardId: "00000000-0000-4000-8000-000000000001",
        name: "Pikachu",
      }),
    [local.plugins]
  );

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/dev/plugins/inspect", { cache: "no-store" });
      setApiPayload(await res.json().catch(() => ({ error: "invalid json" })));
    })();
  }, []);

  return (
    <div className="space-y-mca-lg">
      <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Local loader
        </p>
        <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">
          Plugins: {local.plugins.length} · Errors: {local.errors.length}
        </p>
        <ul className="mt-mca-md list-inside list-disc text-mca-caption text-mca-ink-body">
          {local.plugins.map((p) => (
            <li key={p.id}>
              {p.id} v{p.version} — {p.capabilities.join(", ")}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          Sample merge (card_metadata)
        </p>
        <pre className="mt-mca-sm overflow-x-auto rounded-mca-control bg-mca-surface/80 p-mca-sm text-mca-caption text-mca-ink-muted">
          {JSON.stringify(demoMeta, null, 2)}
        </pre>
      </Panel>

      <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md">
        <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
          GET /api/dev/plugins/inspect
        </p>
        <pre className="mt-mca-sm max-h-64 overflow-auto rounded-mca-control bg-mca-surface/80 p-mca-sm text-mca-caption text-mca-ink-muted">
          {JSON.stringify(apiPayload, null, 2)}
        </pre>
      </Panel>
    </div>
  );
}
