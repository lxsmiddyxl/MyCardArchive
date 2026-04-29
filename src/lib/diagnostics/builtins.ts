import "server-only";

import { registerDiagnostic } from "@/lib/diagnostics/registry";
import { pingSupabaseRest } from "@/lib/health/supabase-ping";
import { isAutoRecoveryEnabled, runRecovery } from "@/lib/recovery";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { registerIngestFailure, registerIngestSuccess } from "@/lib/server/telemetry-ingest-backoff";
import { getRateLimitHealthBuckets } from "@/lib/server/rate-limit-api";
import {
  getLastMcaTelemetryEventAgeMs,
  getRecentSuspenseWaterfallEnvelopes,
} from "@/lib/server/mca-telemetry-buffer";

const CTX = { componentName: "diagnostics", surfaceName: "builtins" } as const;

const STALL_MS = 120_000;
const SATURATION_RATIO = 0.95;

async function realtimeStallCheck(): Promise<{ ok: boolean; data?: unknown }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return {
      ok: false,
      data: { reason: "supabase_env_missing", lastEventAgeMs: getLastMcaTelemetryEventAgeMs() },
    };
  }

  let dbOk = await pingSupabaseRest();
  let lastEventAgeMs = getLastMcaTelemetryEventAgeMs();
  let stalled = lastEventAgeMs !== null && lastEventAgeMs > STALL_MS;
  let ok = dbOk && !stalled;
  let data: Record<string, unknown> = {
    lastEventAgeMs,
    stalled,
    stallThresholdMs: STALL_MS,
    postgrestReachable: dbOk,
  };

  if (!ok && isAutoRecoveryEnabled() && (!dbOk || stalled)) {
    mcaLog.warn("recovery.trigger", { check: "realtimeStallCheck", stalled, dbOk }, CTX);
    const recovery = await runRecovery("realtimeRecoveryAction", {
      check: "realtimeStallCheck",
      stalled,
      postgrestReachable: dbOk,
    });
    dbOk = await pingSupabaseRest();
    lastEventAgeMs = getLastMcaTelemetryEventAgeMs();
    stalled = lastEventAgeMs !== null && lastEventAgeMs > STALL_MS;
    ok = dbOk && !stalled;
    data = {
      ...data,
      lastEventAgeMs,
      stalled,
      postgrestReachable: dbOk,
      recoveryAttempt: true,
      recovery,
    };
  }

  return { ok, data };
}

async function telemetryIngestCheck(): Promise<{ ok: boolean; data?: unknown }> {
  const disabled = process.env.TELEMETRY_INGEST_DISABLED === "1";
  if (disabled) {
    return { ok: false, data: { disabled: true, ingestOk: false } };
  }
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "http://127.0.0.1:3000";
  try {
    const res = await fetch(`${base}/api/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(8000),
    });
    const ingestOk = res.status === 400 || res.status === 401;
    if (ingestOk) registerIngestSuccess();
    else registerIngestFailure();

    let data: Record<string, unknown> = {
      disabled: false,
      ingestOk,
      pingStatus: res.status,
    };
    let ok = ingestOk;

    if (!ok && isAutoRecoveryEnabled()) {
      mcaLog.warn("recovery.trigger", { check: "telemetryIngestCheck" }, CTX);
      const recovery = await runRecovery("telemetryRecoveryAction", { check: "telemetryIngestCheck" });
      const res2 = await fetch(`${base}/api/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(8000),
      });
      const ingestOk2 = res2.status === 400 || res2.status === 401;
      if (ingestOk2) registerIngestSuccess();
      ok = ingestOk2;
      data = {
        ...data,
        ingestOk: ingestOk2,
        pingStatus: res2.status,
        recoveryAttempt: true,
        recovery,
      };
    }

    return { ok, data };
  } catch (err) {
    mcaLog.error("diagnostics.telemetryIngestCheck", { err }, CTX);
    registerIngestFailure();
    if (isAutoRecoveryEnabled()) {
      mcaLog.warn("recovery.trigger", { check: "telemetryIngestCheck", phase: "catch" }, CTX);
      const recovery = await runRecovery("telemetryRecoveryAction", {
        check: "telemetryIngestCheck",
        networkError: true,
      });
      return {
        ok: false,
        data: { disabled: false, ingestOk: false, recoveryAttempt: true, recovery },
      };
    }
    return { ok: false, data: { disabled: false, ingestOk: false } };
  }
}

async function rateLimitSaturationCheck(): Promise<{ ok: boolean; data?: unknown }> {
  const buckets = getRateLimitHealthBuckets();
  let worstRatio = 0;
  for (const b of Object.values(buckets)) {
    const ratio = b.limit > 0 ? b.used / b.limit : 0;
    worstRatio = Math.max(worstRatio, ratio);
  }
  return {
    ok: worstRatio < SATURATION_RATIO,
    data: { buckets, worstRatio, saturationThreshold: SATURATION_RATIO },
  };
}

async function virtualizationRenderLoopCheck(): Promise<{ ok: boolean; data?: unknown }> {
  return {
    ok: true,
    data: {
      scope: "server",
      note:
        "Main-thread / virtualization timing is observed in the dev overlay (localStorage mcaDevtools=1).",
    },
  };
}

async function suspenseWaterfallCheck(): Promise<{ ok: boolean; data?: unknown }> {
  if (process.env.NODE_ENV === "production") {
    return { ok: true, data: { skipped: true } };
  }
  const envs = getRecentSuspenseWaterfallEnvelopes();
  let worstMs = 0;
  for (const e of envs) {
    const ms = typeof e.data?.ms === "number" && Number.isFinite(e.data.ms) ? e.data.ms : 0;
    worstMs = Math.max(worstMs, ms);
  }
  const thresholdMs = 2000;
  return {
    ok: worstMs < thresholdMs,
    data: { worstMs, thresholdMs, sampleCount: envs.length },
  };
}

registerDiagnostic("realtimeStallCheck", realtimeStallCheck);
registerDiagnostic("telemetryIngestCheck", telemetryIngestCheck);
registerDiagnostic("rateLimitSaturationCheck", rateLimitSaturationCheck);
registerDiagnostic("virtualizationRenderLoopCheck", virtualizationRenderLoopCheck);
registerDiagnostic("suspenseWaterfallCheck", suspenseWaterfallCheck);
