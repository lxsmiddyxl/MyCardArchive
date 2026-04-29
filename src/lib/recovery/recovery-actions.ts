import "server-only";

import { pingSupabaseRest } from "@/lib/health/supabase-ping";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { registerRecoveryAction } from "@/lib/recovery/recovery-engine";
import type { RecoveryResult } from "@/lib/recovery/recovery-engine";
import { injectRecoveryTelemetryHeartbeat } from "@/lib/server/mca-telemetry-buffer";
import {
  resetSyntheticInpMetricsOnly,
  resetVirtualizationMetricsOnly,
} from "@/lib/server/mca-stability-metrics";
import { resetIngestBackoff } from "@/lib/server/telemetry-ingest-backoff";
import { performFailback, performFailover } from "@/lib/failover/failover-engine";

const CTX = { componentName: "recovery", surfaceName: "actions" } as const;

function predictiveFlags(context: Record<string, unknown>): Record<string, unknown> {
  if (context.predictiveTrigger === true) {
    return { recoveryAttempt: true, predictiveTrigger: true };
  }
  return {};
}

async function realtimeRecoveryAction(
  context: Record<string, unknown>
): Promise<RecoveryResult> {
  mcaLog.warn("recovery.realtime", { phase: "start", ...context }, CTX);
  injectRecoveryTelemetryHeartbeat("realtimeRecovery");

  const reachable = await pingSupabaseRest();
  mcaLog.event(
    "recovery.realtime",
    { postgrestReachable: reachable, note: "channel_resubscribe_is_client_side" },
    CTX
  );

  return {
    ok: true,
    recovered: true,
    data: { postgrestReachable: reachable, bufferHeartbeat: true, ...predictiveFlags(context) },
  };
}

async function telemetryRecoveryAction(
  context: Record<string, unknown>
): Promise<RecoveryResult> {
  mcaLog.warn("recovery.telemetry", { phase: "start", ...context }, CTX);
  resetIngestBackoff();

  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "http://127.0.0.1:3000";
  let pingStatus = 0;
  try {
    const res = await fetch(`${base}/api/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });
    pingStatus = res.status;
  } catch (err) {
    mcaLog.warn("recovery.telemetry.ping_failed", { err }, CTX);
    return {
      ok: false,
      recovered: false,
      data: { pingFailed: true, ...predictiveFlags(context) },
    };
  }

  const ingestOk = pingStatus === 400 || pingStatus === 401;
  mcaLog.event("recovery.telemetry", { ingestOk, pingStatus }, CTX);

  return {
    ok: true,
    recovered: ingestOk,
    data: { ingestOk, pingStatus, backoffReset: true, ...predictiveFlags(context) },
  };
}

async function virtualizationRecoveryAction(
  context: Record<string, unknown>
): Promise<RecoveryResult> {
  mcaLog.warn("recovery.virtualization", { phase: "start", ...context }, CTX);
  resetVirtualizationMetricsOnly();
  mcaLog.event("recovery.virtualization", { cleared: "server_metrics" }, CTX);
  return {
    ok: true,
    recovered: true,
    data: { serverVirtualizationStoreCleared: true, ...predictiveFlags(context) },
  };
}

async function regionFailoverAction(context: Record<string, unknown>): Promise<RecoveryResult> {
  mcaLog.warn("recovery.region_failover", { phase: "start", ...context }, CTX);
  const out = await performFailover();
  return {
    ok: out.ok,
    recovered: out.success === true,
    data: {
      ...(out.data && typeof out.data === "object" ? (out.data as object) : { result: out.data }),
      recoveryAttempt: true,
      ...predictiveFlags(context),
      context,
    },
  };
}

async function regionFailbackAction(context: Record<string, unknown>): Promise<RecoveryResult> {
  mcaLog.warn("recovery.region_failback", { phase: "start", ...context }, CTX);
  const out = await performFailback();
  return {
    ok: out.ok,
    recovered: out.success === true,
    data: {
      ...(out.data && typeof out.data === "object" ? (out.data as object) : { result: out.data }),
      recoveryAttempt: true,
      ...predictiveFlags(context),
      context,
    },
  };
}

async function uiResponsivenessRecoveryAction(
  context: Record<string, unknown>
): Promise<RecoveryResult> {
  mcaLog.warn("recovery.ui", { phase: "start", ...context }, CTX);
  resetSyntheticInpMetricsOnly();
  const hydrationProbe =
    process.env.NODE_ENV !== "production" || process.env.STABILITY_MODE === "1";
  mcaLog.event(
    "recovery.ui",
    {
      syntheticInpCleared: true,
      softHydrationCheck: hydrationProbe ? "enabled_dev_or_stability" : "skipped_production",
    },
    CTX
  );
  return {
    ok: true,
    recovered: true,
    data: {
      syntheticInpReset: true,
      softHydrationCheck: hydrationProbe,
      ...predictiveFlags(context),
    },
  };
}

registerRecoveryAction("realtimeRecoveryAction", realtimeRecoveryAction);
registerRecoveryAction("telemetryRecoveryAction", telemetryRecoveryAction);
registerRecoveryAction("virtualizationRecoveryAction", virtualizationRecoveryAction);
registerRecoveryAction("uiResponsivenessRecoveryAction", uiResponsivenessRecoveryAction);
registerRecoveryAction("regionFailoverAction", regionFailoverAction);
registerRecoveryAction("regionFailbackAction", regionFailbackAction);
