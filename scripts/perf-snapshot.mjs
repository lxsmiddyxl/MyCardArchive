#!/usr/bin/env node
/**
 * Phase 55 — Perf snapshot from /api/health/diagnostics (perf.hotPaths).
 *
 * Usage:
 *   PERF_SNAPSHOT_BASE_URL=http://127.0.0.1:3000 node scripts/perf-snapshot.mjs [--out perf-report.json]
 *
 * Exit 1 on:
 * - Any hot path with samples > 0 and budget > 0 where p95 > budget * 2 (hard ceiling)
 * - Any ID in CRITICAL_HOT_PATH_IDS with samples === 0 (missing instrumentation), unless PERF_ALLOW_ZERO_SAMPLES=1
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function argOut() {
  const i = process.argv.indexOf("--out");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return "perf-report.json";
}

/** Must match hot-path-ids.ts — used to detect missing instrumentation in CI. */
const CRITICAL_HOT_PATH_IDS = [
  "hp:home:aboveTheFold",
  "hp:collection:listViewport",
  "hp:trade:detail",
  "hp:activity:feed",
  "hp:notifications:list",
  "hp:search:cards",
];

const base =
  process.env.PERF_SNAPSHOT_BASE_URL?.trim().replace(/\/$/, "") ||
  process.env.DIAGNOSTICS_URL?.trim().replace(/\/$/, "") ||
  "";

if (!base) {
  console.error(
    "perf-snapshot: set PERF_SNAPSHOT_BASE_URL or DIAGNOSTICS_URL (e.g. http://127.0.0.1:3000)"
  );
  process.exit(2);
}

const allowZeroSamples = process.env.PERF_ALLOW_ZERO_SAMPLES === "1";

async function main() {
  const outPath = resolve(argOut());
  const url = `${base}/api/health/diagnostics`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error("perf-snapshot: invalid JSON from diagnostics");
    process.exit(1);
  }

  const hotPaths = Array.isArray(body?.perf?.hotPaths) ? body.perf.hotPaths : [];
  const failures = [];

  for (const row of hotPaths) {
    const budget = Number(row?.budget);
    const p95 = Number(row?.p95);
    const samples = Number(row?.samples);
    if (samples > 0 && budget > 0 && p95 > budget * 2) {
      failures.push({
        id: row?.id,
        reason: "p95_exceeds_hard_ceiling",
        p95,
        budget,
        ceiling: budget * 2,
      });
    }
  }

  const byId = new Map(hotPaths.map((r) => [r.id, r]));
  if (!allowZeroSamples) {
    for (const id of CRITICAL_HOT_PATH_IDS) {
      const row = byId.get(id);
      const samples = row ? Number(row.samples) : 0;
      if (samples === 0) {
        failures.push({ id, reason: "critical_hot_path_no_samples" });
      }
    }
  }

  const report = {
    timestamp: Date.now(),
    baseUrl: base,
    diagnosticsOk: body?.ok === true,
    hotPaths,
    failures,
    criticalHotPathIds: CRITICAL_HOT_PATH_IDS,
    allowZeroSamples,
  };

  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`perf-snapshot: wrote ${outPath} (${failures.length} failure(s))`);

  if (failures.length > 0) {
    console.error("perf-snapshot failures:", JSON.stringify(failures, null, 2));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("perf-snapshot:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
