#!/usr/bin/env node
/**
 * Phase 49 — Unified stability report: health, diagnostics, telemetry ping, realtime synthetic, UI probe.
 *
 * Usage:
 *   STABILITY_BASE_URL=http://127.0.0.1:3000 node scripts/stability-runner.mjs [--out stability-report.json]
 *   STABILITY_SKIP_REALTIME_SYNTHETIC=1  # CI / placeholder Supabase
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runRealtimeSynthetic, STALL_MS } from "./realtime-synthetic.mjs";

function argOut() {
  const i = process.argv.indexOf("--out");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return "stability-report.json";
}

const base = process.env.STABILITY_BASE_URL?.trim().replace(/\/$/, "") || "";
if (!base) {
  console.error("stability-runner: set STABILITY_BASE_URL (e.g. http://127.0.0.1:3000)");
  process.exit(2);
}

const PRED_WARN_CONF = (() => {
  const n = Number(process.env.PREDICTIVE_CONFIDENCE_THRESHOLD);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.85;
})();

const HEALTH_PATHS = [
  "/api/health/core",
  "/api/health/realtime",
  "/api/health/telemetry",
  "/api/health/rate-limits",
  "/api/health/diagnostics",
  "/api/health/ui",
  "/api/health/region",
];

/** GitHub Actions uses placeholder Supabase; these probes need a real project. */
const CI_PLACEHOLDER =
  process.env.STABILITY_CI_PLACEHOLDER === "1" ||
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("example.supabase.co"));

const PLACEHOLDER_SOFT_HEALTH_PATHS = new Set([
  "/api/health/realtime",
  "/api/health/telemetry",
  "/api/health/rate-limits",
  "/api/health/diagnostics",
]);

/** @type {Record<string, string>} */
const HEALTH_KEY = {
  "/api/health/core": "core",
  "/api/health/realtime": "realtime",
  "/api/health/telemetry": "telemetry",
  "/api/health/rate-limits": "rateLimits",
  "/api/health/diagnostics": "diagnostics",
  "/api/health/ui": "ui",
  "/api/health/region": "region",
};

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) };
  } catch {
    return { ok: false, status: res.status, json: { parseError: true, text: text.slice(0, 200) } };
  }
}

function diagResult(results, name) {
  if (!Array.isArray(results)) return null;
  return results.find((r) => r && r.name === name) ?? null;
}

function extractVirtualization(diagJson) {
  const r = diagResult(diagJson?.results, "virtualizationRegressionCheck");
  const d = r?.data ?? {};
  return {
    ok: r ? r.ok !== false : true,
    renderLoops: typeof d.renderLoops === "number" ? d.renderLoops : 0,
    overscanHits: typeof d.overscanHits === "number" ? d.overscanHits : 0,
    stale: Boolean(d.stale),
  };
}

function extractSyntheticInp(diagJson) {
  const r = diagResult(diagJson?.results, "syntheticInpCheck");
  const d = r?.data ?? {};
  if (d.skipped) return null;
  return typeof d.lastMs === "number" ? d.lastMs : null;
}

async function pingTelemetryLog() {
  try {
    const res = await fetch(`${base}/api/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(12_000),
    });
    const ingestOk = res.status === 400 || res.status === 401;
    return { ok: ingestOk, ingestOk, status: res.status };
  } catch (e) {
    return { ok: false, ingestOk: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  const health = {};
  let healthAllOk = true;

  for (const path of HEALTH_PATHS) {
    const url = `${base}${path}`;
    const { ok, status, json } = await fetchJson(url);
    const soft = json && typeof json === "object" && json.ok === true;
    const softPlaceholder = CI_PLACEHOLDER && PLACEHOLDER_SOFT_HEALTH_PATHS.has(path);
    if (!soft && !softPlaceholder) healthAllOk = false;
    const key = HEALTH_KEY[path];
    health[key] = {
      httpOk: ok,
      status,
      body: json,
    };
  }

  const realtimeHealth = health.realtime?.body;
  const telemetryHealth = health.telemetry?.body;
  const diagnosticsJson = health.diagnostics?.body;
  const uiHealth = health.ui?.body;

  const telemPing = CI_PLACEHOLDER
    ? { ok: true, ingestOk: true, status: 0, skipped: true }
    : await pingTelemetryLog();

  const predUrl = `${base}/api/health/predictive`;
  const predFetch = await fetchJson(predUrl);
  const predJson = predFetch.json;
  const predictiveHotWarn =
    Array.isArray(predJson?.predictions) &&
    predJson.predictions.some(
      (p) =>
        p &&
        p.severity === "warn" &&
        typeof p.confidence === "number" &&
        p.confidence > PRED_WARN_CONF
    );
  const predictiveFail =
    predJson?.highestSeverity === "critical" || predictiveHotWarn;

  const loadUrl = `${base}/api/health/load`;
  const loadFetch = await fetchJson(loadUrl);
  const loadJson = loadFetch.json;
  const loadFail =
    loadJson?.loadState === "critical" || loadJson?.degradationMode === "degrade:severe";

  const skipRt =
    process.env.STABILITY_SKIP_REALTIME_SYNTHETIC === "1" ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("example.supabase.co");

  let realtime;
  if (skipRt) {
    realtime = {
      ok: true,
      latencyMs: null,
      stall: false,
      skipped: true,
      reason: "STABILITY_SKIP_REALTIME_SYNTHETIC or placeholder Supabase URL",
    };
  } else {
    try {
      const r = await runRealtimeSynthetic({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
      realtime = {
        ok: r.ok,
        latencyMs: r.latencyMs,
        stall: Boolean(r.stall),
        skipped: Boolean(r.skipped),
        p50LatencyMs: r.p50LatencyMs,
        maxLatencyMs: r.maxLatencyMs,
        sent: r.sent,
        received: r.received,
        missed: r.missed,
        outOfOrder: r.outOfOrder,
        stallThresholdMs: STALL_MS,
      };
    } catch (e) {
      realtime = {
        ok: false,
        latencyMs: null,
        stall: true,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  const lastEventAge =
    typeof realtimeHealth?.lastEventAgeMs === "number" ? realtimeHealth.lastEventAgeMs : null;
  const stallFromBuffer = lastEventAge !== null && lastEventAge > STALL_MS;
  if (!skipRt && stallFromBuffer && realtime && typeof realtime === "object") {
    realtime = { ...realtime, stall: true, bufferStall: true };
    if (realtime.ok) realtime.ok = false;
  }

  const virtualization = extractVirtualization(diagnosticsJson);

  const syntheticINP = extractSyntheticInp(diagnosticsJson);

  const ui = {
    ok: uiHealth?.ok === true && typeof uiHealth?.responseTimeMs === "number",
    responseTimeMs: uiHealth?.responseTimeMs ?? null,
    syntheticINP,
  };

  const telemetry = CI_PLACEHOLDER
    ? { ok: true, ingestOk: true, logPing: telemPing }
    : {
        ok: telemetryHealth?.ok === true && telemPing.ok,
        ingestOk: Boolean(telemetryHealth?.ingestOk && telemPing.ingestOk),
        logPing: telemPing,
      };

  const reportOk =
    healthAllOk &&
    realtime.ok !== false &&
    virtualization.ok !== false &&
    telemetry.ok !== false &&
    ui.ok !== false &&
    !predictiveFail &&
    predJson?.ok !== false &&
    !loadFail &&
    loadJson?.ok !== false;

  const report = {
    ok: reportOk,
    generatedAt: new Date().toISOString(),
    baseUrl: base,
    predictive: {
      httpOk: predFetch.ok,
      status: predFetch.status,
      body: predJson,
      failReason: predictiveFail
        ? predJson?.highestSeverity === "critical"
          ? "highestSeverity_critical_or_predictive_ok_false"
          : "warn_confidence_above_0.85"
        : undefined,
    },
    load: {
      httpOk: loadFetch.ok,
      status: loadFetch.status,
      loadState: loadJson?.loadState ?? null,
      degradationMode: loadJson?.degradationMode ?? null,
      body: loadJson,
      failReason: loadFail
        ? loadJson?.loadState === "critical"
          ? "loadState_critical"
          : "degradation_severe"
        : undefined,
    },
    realtime,
    virtualization,
    telemetry,
    ui,
    health: {
      core: health.core?.body,
      realtime: health.realtime?.body,
      telemetry: health.telemetry?.body,
      rateLimits: health.rate_limits?.body,
      diagnostics: health.diagnostics?.body,
      ui: health.ui?.body,
    },
  };

  const outPath = resolve(process.cwd(), argOut());
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ ok: reportOk, written: outPath }, null, 2));

  process.exit(reportOk ? 0 : 1);
}

main().catch((e) => {
  console.error("stability-runner:", e);
  process.exit(1);
});
