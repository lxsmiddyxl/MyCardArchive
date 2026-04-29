import "server-only";

import { mcaLog } from "@/lib/logging/mca-log-server";
import { recordRecoveryAttempt } from "@/lib/server/recovery-state";
import { canRunRecoveryAction, markRecoveryRun } from "./recovery-cooldown";

const RECOVERY_CTX = { componentName: "recovery", surfaceName: "engine" } as const;

export type RecoveryResult = {
  ok: boolean;
  recovered: boolean;
  data?: unknown;
};

export type RecoveryActionFn = (context: Record<string, unknown>) => Promise<RecoveryResult>;

export const RecoveryRegistry = new Map<string, RecoveryActionFn>();

export function registerRecoveryAction(name: string, fn: RecoveryActionFn): void {
  RecoveryRegistry.set(name, fn);
}

export async function runRecovery(
  name: string,
  context: Record<string, unknown> = {}
): Promise<RecoveryResult> {
  const fn = RecoveryRegistry.get(name);
  if (!fn) {
    const r: RecoveryResult = { ok: false, recovered: false, data: { error: "unknown_recovery_action", name } };
    mcaLog.warn("recovery.unknown", { name }, RECOVERY_CTX);
    recordRecoveryAttempt({ name, ok: false, recovered: false, data: r.data });
    return r;
  }

  if (!canRunRecoveryAction(name)) {
    const r: RecoveryResult = { ok: true, recovered: false, data: { skipped: true, reason: "cooldown" } };
    mcaLog.event("recovery.skipped", { name, reason: "cooldown" }, RECOVERY_CTX);
    return r;
  }

  markRecoveryRun(name);
  mcaLog.event("recovery.start", { name, ...context }, RECOVERY_CTX);

  try {
    const out = await fn(context);
    mcaLog.event(
      "recovery.complete",
      { name, ok: out.ok, recovered: out.recovered, data: out.data },
      RECOVERY_CTX
    );
    recordRecoveryAttempt({
      name,
      ok: out.ok,
      recovered: out.recovered,
      data: out.data,
    });
    return out;
  } catch (err) {
    mcaLog.warn("recovery.failed", { name, err }, RECOVERY_CTX);
    const r: RecoveryResult = {
      ok: false,
      recovered: false,
      data: { error: err instanceof Error ? err.message : String(err) },
    };
    recordRecoveryAttempt({ name, ok: false, recovered: false, data: r.data });
    return r;
  }
}

export function isAutoRecoveryEnabled(): boolean {
  if (process.env.RECOVERY_AUTO_HEAL === "0") return false;
  if (process.env.RECOVERY_AUTO_HEAL === "1") return true;
  return process.env.STABILITY_MODE === "1";
}
