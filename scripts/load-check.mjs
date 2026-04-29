#!/usr/bin/env node
/**
 * Phase 54 — Sample /api/health/load for ~5s and write load-report.json.
 * Fails if max event-loop lag or proxy jitter exceed thresholds or loadState is critical.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function argOut() {
  const i = process.argv.indexOf("--out");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return "load-report.json";
}

const base =
  process.env.LOAD_CHECK_URL?.trim().replace(/\/$/, "") ||
  process.env.STABILITY_BASE_URL?.trim().replace(/\/$/, "") ||
  "";

if (!base) {
  console.error("load-check: set LOAD_CHECK_URL or STABILITY_BASE_URL (e.g. http://127.0.0.1:3000)");
  process.exit(2);
}

const SAMPLE_MS = 500;
const DURATION_MS = 5000;
const DEFAULT_LAG_FAIL = Number(process.env.LOAD_CHECK_LAG_FAIL_MS) || 600;
const DEFAULT_JITTER_FAIL = Number(process.env.LOAD_CHECK_JITTER_FAIL_MS) || 25;

async function fetchLoad() {
  const res = await fetch(`${base}/api/health/load`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, json: JSON.parse(text) };
  } catch {
    return { ok: false, json: { parseError: true, text: text.slice(0, 200) } };
  }
}

async function main() {
  const samples = [];
  const t0 = Date.now();
  while (Date.now() - t0 < DURATION_MS) {
    const { json } = await fetchLoad();
    const snap = json?.snapshot;
    samples.push({
      at: new Date().toISOString(),
      loadState: json?.loadState,
      eventLoopLagMs: snap?.eventLoopLagMs ?? null,
      rafJitterProxy: snap?.rafJitterProxy ?? null,
      regionLatencyMs: snap?.regionLatencyMs ?? null,
    });
    await new Promise((r) => setTimeout(r, SAMPLE_MS));
  }

  const lags = samples.map((s) => s.eventLoopLagMs).filter((x) => typeof x === "number");
  const jitters = samples.map((s) => s.rafJitterProxy).filter((x) => typeof x === "number");
  const maxLag = lags.length ? Math.max(...lags) : 0;
  const maxJitter = jitters.length ? Math.max(...jitters) : 0;
  const anyCritical = samples.some((s) => s.loadState === "critical");

  const failLag = maxLag > DEFAULT_LAG_FAIL;
  const failJitter = maxJitter > DEFAULT_JITTER_FAIL;
  const fail = anyCritical || failLag || failJitter;

  const outPath = resolve(process.cwd(), argOut());
  const report = {
    ok: !fail,
    baseUrl: base,
    sampledAt: new Date().toISOString(),
    durationMs: DURATION_MS,
    sampleIntervalMs: SAMPLE_MS,
    samples,
    maxEventLoopLagMs: maxLag,
    maxRafJitterProxy: maxJitter,
    thresholds: {
      lagFailMs: DEFAULT_LAG_FAIL,
      jitterFailMs: DEFAULT_JITTER_FAIL,
    },
    failReason: fail
      ? anyCritical
        ? "loadState_critical"
        : failLag
          ? "event_loop_lag"
          : "raf_jitter_proxy"
      : undefined,
  };

  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ ok: !fail, written: outPath, failReason: report.failReason }, null, 2));
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("load-check:", e);
  process.exit(1);
});
