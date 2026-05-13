#!/usr/bin/env node
/**
 * Lightweight scale smoke: sequential public health reads (Phase 68).
 * Usage: SCALE_SMOKE_BASE_URL=http://127.0.0.1:3000 SCALE_SMOKE_ITERATIONS=40 node scripts/scale-smoke.mjs
 */
const base = (process.env.SCALE_SMOKE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const iterations = Math.min(500, Math.max(1, parseInt(process.env.SCALE_SMOKE_ITERATIONS ?? "30", 10)));

async function main() {
  const t0 = Date.now();
  let ok = 0;
  for (let i = 0; i < iterations; i++) {
    const r = await fetch(`${base}/api/health/ui`, { method: "GET" });
    if (r.ok) ok++;
  }
  const ms = Date.now() - t0;
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok, iterations, ms, rps: iterations / (ms / 1000) }));
  if (ok !== iterations) process.exitCode = 1;
}

void main();
