#!/usr/bin/env node
/**
 * Phase 53 — Fetch /api/health/predictive and exit non-zero on risk thresholds.
 * Usage: PREDICT_BASE_URL=http://127.0.0.1:3000 node scripts/predictive-check.mjs [--out predictive-report.json]
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

function argOut() {
  const i = process.argv.indexOf("--out");
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return "predictive-report.json";
}

const base =
  process.env.PREDICT_BASE_URL?.trim().replace(/\/$/, "") ||
  process.env.STABILITY_BASE_URL?.trim().replace(/\/$/, "") ||
  "";

if (!base) {
  console.error(
    "predictive-check: set PREDICT_BASE_URL or STABILITY_BASE_URL (e.g. http://127.0.0.1:3000)"
  );
  process.exit(2);
}

const WARN_CONFIDENCE = (() => {
  const n = Number(process.env.PREDICTIVE_CONFIDENCE_THRESHOLD);
  return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.85;
})();

function predictiveFails(json) {
  if (!json || typeof json !== "object") return { fail: true, reason: "invalid_json" };
  if (json.highestSeverity === "critical") {
    return { fail: true, reason: "highestSeverity_critical" };
  }
  const preds = Array.isArray(json.predictions) ? json.predictions : [];
  const hotWarn = preds.some(
    (p) => p && p.severity === "warn" && typeof p.confidence === "number" && p.confidence > WARN_CONFIDENCE
  );
  if (hotWarn) return { fail: true, reason: "warn_high_confidence" };
  return { fail: false };
}

async function main() {
  const url = `${base}/api/health/predictive`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("predictive-check: invalid JSON", text.slice(0, 200));
    process.exit(1);
  }

  const { fail, reason } = predictiveFails(json);
  const outPath = resolve(process.cwd(), argOut());
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        ok: !fail,
        checkedAt: new Date().toISOString(),
        baseUrl: base,
        reason: fail ? reason : undefined,
        body: json,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(JSON.stringify({ ok: !fail, written: outPath, reason: fail ? reason : undefined }, null, 2));
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("predictive-check:", e);
  process.exit(1);
});
