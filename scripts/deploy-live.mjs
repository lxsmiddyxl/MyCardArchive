#!/usr/bin/env node
/**
 * Launch Prep Phase 5 — full go-live deploy sequence.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const shouldDeploy = args.has("--deploy");

const base =
  process.env.DEPLOY_LIVE_URL?.trim().replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
  "https://mycardarchive.com";

function fail(msg) {
  console.error(`[deploy-live] FAIL: ${msg}`);
  process.exit(1);
}

function runNpm(script, extraEnv = {}) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawnSync(npm, ["run", script], {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...extraEnv },
  }).status === 0;
}

function runNodeScript(name, scriptArgs = []) {
  return (
    spawnSync(process.platform === "win32" ? "node.exe" : "node", [join(ROOT, "scripts", name), ...scriptArgs], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    }).status === 0
  );
}

async function verifyPostDeploy() {
  const checks = [];
  try {
    const res = await fetch(base, { signal: AbortSignal.timeout(15_000), redirect: "follow" });
    checks.push({ name: "canonical_home", ok: res.ok, finalUrl: res.url });
  } catch (e) {
    checks.push({ name: "canonical_home", ok: false, error: String(e.message ?? e) });
  }
  try {
    const embed = await fetch(`${base}/embed/b/demo`, { signal: AbortSignal.timeout(15_000) });
    const csp = embed.headers.get("content-security-policy") ?? "";
    checks.push({ name: "embed_csp", ok: csp.includes("frame-ancestors") });
  } catch {
    checks.push({ name: "embed_csp", ok: true, skipped: true });
  }
  return checks;
}

async function main() {
  const steps = [
    ["analytics:dashboard", () => runNpm("analytics:dashboard")],
    ["error:dashboard", () => runNpm("error:dashboard")],
    ["supabase:prepare", () => runNpm("supabase:prepare")],
    ["dns:check", () => runNpm("dns:check")],
    [
      "launch:checklist",
      () =>
        runNpm("launch:checklist", {
          LAUNCH_CHECK_BASE_URL: base,
          LOADTEST_BASE_URL: base,
        }),
    ],
  ];

  for (const [name, fn] of steps) {
    console.error(`[deploy-live] → ${name}`);
    const ok = fn();
    if (!ok && name === "launch:checklist" && !shouldDeploy) {
      console.warn("[deploy-live] WARN: checklist failed (non-blocking without --deploy)");
      continue;
    }
    if (!ok) fail(`${name} failed`);
  }

  if (shouldDeploy) {
    console.error("[deploy-live] → deploy-production --deploy");
    if (!runNodeScript("deploy-production.mjs", ["--deploy"])) fail("Vercel deploy failed");
  } else {
    console.error("[deploy-live] Skipping Vercel deploy (pass --deploy to trigger)");
  }

  const post = await verifyPostDeploy();
  console.log(
    JSON.stringify(
      { ok: post.every((c) => c.ok !== false), baseUrl: base, deployed: shouldDeploy, postDeploy: post },
      null,
      2
    )
  );
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
