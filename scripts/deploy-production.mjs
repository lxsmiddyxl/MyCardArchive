#!/usr/bin/env node
/**
 * Launch Prep Phase 4 — production deploy gate + optional Vercel trigger.
 *
 *   node scripts/deploy-production.mjs
 *   node scripts/deploy-production.mjs --deploy
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const shouldDeploy = args.has("--deploy");

function fail(msg) {
  console.error(`[deploy-production] FAIL: ${msg}`);
  process.exit(1);
}

function checkEnv() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ];
  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length) fail(`Missing env: ${missing.join(", ")}`);

  const site = process.env.NEXT_PUBLIC_SITE_URL.trim().replace(/\/$/, "");
  if (!site.includes("mycardarchive.com")) {
    fail(`NEXT_PUBLIC_SITE_URL must use mycardarchive.com (got ${site})`);
  }

  const embed = process.env.MCA_EMBED_ALLOWLIST?.trim();
  if (!embed?.includes("mycardarchive.com")) {
    console.warn("[deploy-production] WARN: MCA_EMBED_ALLOWLIST missing apex host");
  }
}

async function checkSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim();
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) fail(`Supabase REST unreachable (${res.status})`);
}

async function triggerVercelDeploy() {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId) {
    fail("VERCEL_TOKEN and VERCEL_PROJECT_ID required for --deploy");
  }
  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "mycardarchive",
      project: projectId,
      target: "production",
    }),
    signal: AbortSignal.timeout(60_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) fail(`Vercel deploy failed: ${JSON.stringify(json)}`);
  return json;
}

function runPrepareScripts() {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  for (const script of ["supabase:prepare", "dns:check"]) {
    const r = spawnSync(npm, ["run", script], {
      cwd: ROOT,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (r.status !== 0) fail(`${script} failed`);
  }
}

async function main() {
  checkEnv();
  await checkSupabase();
  runPrepareScripts();

  let deployment = null;
  if (shouldDeploy) {
    deployment = await triggerVercelDeploy();
  }

  const report = {
    ok: true,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    supabase: "ok",
    embedAllowlist: process.env.MCA_EMBED_ALLOWLIST ?? "default",
    deployed: Boolean(deployment),
    deploymentId: deployment?.id ?? null,
    at: new Date().toISOString(),
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  fail(e instanceof Error ? e.message : String(e));
});
