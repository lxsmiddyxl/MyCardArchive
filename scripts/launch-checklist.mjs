#!/usr/bin/env node
/**
 * Launch Prep Phase 4 — automated pre-launch checklist (PASS/FAIL summary).
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const base =
  process.env.LAUNCH_CHECK_BASE_URL?.trim().replace(/\/$/, "") ||
  process.env.LOADTEST_BASE_URL?.trim().replace(/\/$/, "") ||
  "http://127.0.0.1:3000";

const checks = [];

function run(name, fn) {
  try {
    const result = fn();
    checks.push({ name, ...result });
  } catch (e) {
    checks.push({ name, ok: false, detail: String(e.message ?? e) });
  }
}

function npmScript(script) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const r = spawnSync(npm, ["run", script], {
    cwd: ROOT,
    stdio: "pipe",
    shell: process.platform === "win32",
    env: { ...process.env, LOADTEST_BASE_URL: base, VERIFY_BASE_URL: base },
  });
  return r.status === 0;
}

async function fetchOk(path) {
  try {
    const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(8000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

run("migrations_prepared", () => ({
  ok: npmScript("supabase:prepare"),
  detail: "supabase:prepare",
}));

run("canonical_domain", () => ({
  ok: npmScript("dns:check"),
  detail: "dns:check",
}));

run("embed_allowlist_env", () => {
  const embed = process.env.MCA_EMBED_ALLOWLIST ?? "https://mycardarchive.com";
  return { ok: embed.includes("mycardarchive.com"), detail: embed };
});

run("analytics_verify", () => ({
  ok: npmScript("verify:analytics"),
  detail: "verify:analytics",
}));

run("errors_verify", () => ({
  ok: npmScript("verify:errors"),
  detail: "verify:errors",
}));

run("load_tests", () => ({
  ok: npmScript("loadtest"),
  detail: "loadtest",
}));

async function pageChecks() {
  const pages = [
    ["/", "marketing_home"],
    ["/onboarding", "onboarding"],
    ["/features/binders", "marketing_feature"],
    ["/embed/b/demo", "embed_page"],
  ];
  for (const [path, name] of pages) {
    const ok = await fetchOk(path);
    checks.push({ name: `reachable_${name}`, ok, detail: `${base}${path}` });
  }
}

await pageChecks();

const failed = checks.filter((c) => !c.ok);
const report = {
  ok: failed.length === 0,
  passed: checks.filter((c) => c.ok).length,
  failed: failed.length,
  checks,
  at: new Date().toISOString(),
};

console.log("\n=== LAUNCH CHECKLIST ===\n");
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}  ${c.detail ?? ""}`);
}
console.log(`\n${report.ok ? "OVERALL: PASS" : "OVERALL: FAIL"} (${report.passed}/${checks.length})\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
