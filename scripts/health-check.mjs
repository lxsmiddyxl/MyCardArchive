#!/usr/bin/env node
/**
 * Fetches MCA health endpoints and exits non-zero if any payload has ok:false.
 * Usage: HEALTH_CHECK_URL=https://example.com node scripts/health-check.mjs
 *    or: node scripts/health-check.mjs https://example.com
 */

const baseArg = process.env.HEALTH_CHECK_URL?.trim().replace(/\/$/, "") || process.argv[2]?.trim();
if (!baseArg) {
  console.error(
    "health-check: set HEALTH_CHECK_URL or pass base URL as first argument (e.g. http://127.0.0.1:3000)"
  );
  process.exit(2);
}

/** All first-party JSON health routes (aligned with stability-runner’s HTTP checks). */
const DEFAULT_PATHS = [
  "/api/health/core",
  "/api/health/realtime",
  "/api/health/telemetry",
  "/api/health/rate-limits",
  "/api/health/diagnostics",
  "/api/health/ui",
  "/api/health/region",
];

const paths = (() => {
  const raw = process.env.HEALTH_CHECK_PATHS?.trim();
  if (!raw) return DEFAULT_PATHS;
  const split = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return split.length > 0 ? split : DEFAULT_PATHS;
})();

async function main() {
  const results = {};
  let anyBad = false;

  for (const path of paths) {
    const url = `${baseArg}${path}`;
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        console.error(`health-check: ${path} invalid JSON`, text.slice(0, 200));
        anyBad = true;
        results[path] = { ok: false, httpStatus: res.status, parseError: true };
        continue;
      }
      const softOk = json && typeof json === "object" && json.ok === true;
      if (!softOk) anyBad = true;
      results[path] = { ok: json?.ok === true, httpStatus: res.status, body: json };
    } catch (err) {
      anyBad = true;
      results[path] = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  const summary = {
    baseUrl: baseArg,
    ok: !anyBad,
    checkedAt: new Date().toISOString(),
    results,
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(anyBad ? 1 : 0);
}

main().catch((err) => {
  console.error("health-check: fatal", err);
  process.exit(1);
});
