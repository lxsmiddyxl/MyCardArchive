#!/usr/bin/env node
/**
 * Light rate-limit smoke: sequential GETs to /api/health/rate-limits (read-only).
 * Does not assert saturation — use after deploy to confirm endpoint stays reachable under burst.
 *
 *   node scripts/rate-limit-smoke.mjs
 *   RATE_LIMIT_SMOKE_ITERATIONS=40 node scripts/rate-limit-smoke.mjs
 */

const base = (process.env.RATE_LIMIT_SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const iterations = Math.min(
  200,
  Math.max(1, Number.parseInt(process.env.RATE_LIMIT_SMOKE_ITERATIONS ?? "25", 10) || 25)
);

async function main() {
  const t0 = Date.now();
  let ok = 0;
  for (let i = 0; i < iterations; i++) {
    const res = await fetch(`${base}/api/health/rate-limits`, { cache: "no-store" });
    if (res.ok) ok += 1;
  }
  const ms = Date.now() - t0;
  console.log(JSON.stringify({ ok, iterations, ms, base }, null, 2));
  if (ok !== iterations) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
