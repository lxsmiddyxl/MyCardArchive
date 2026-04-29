import "server-only";

import { mcaLog } from "@/lib/logging/mca-log-server";
import type { DiagnosticFn, DiagnosticResult } from "@/lib/diagnostics/types";

const CTX = { componentName: "diagnostics", surfaceName: "registry" } as const;

/** Registered async checks (name → runner). */
export const DiagnosticsRegistry = new Map<string, DiagnosticFn>();

export function registerDiagnostic(name: string, fn: DiagnosticFn): void {
  DiagnosticsRegistry.set(name, fn);
}

export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  for (const [name, fn] of DiagnosticsRegistry.entries()) {
    const ts = Date.now();
    try {
      const r = await fn();
      results.push({ name, ok: r.ok, data: r.data, ts });
    } catch (err) {
      mcaLog.error("diagnostics.run", { err, name }, CTX);
      results.push({
        name,
        ok: false,
        data: { error: err instanceof Error ? err.message : String(err) },
        ts,
      });
    }
  }
  return results;
}
