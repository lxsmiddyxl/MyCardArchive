#!/usr/bin/env node
/**
 * Post-deploy gate: runs health + stability suites. On failure writes rollback.json and exits 1.
 *
 * Required env (typical):
 *   HEALTH_CHECK_URL / STABILITY_BASE_URL — same base, e.g. https://app.example.com
 */

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const base =
  process.env.DEPLOY_VERIFY_URL?.trim().replace(/\/$/, "") ||
  process.env.HEALTH_CHECK_URL?.trim().replace(/\/$/, "") ||
  process.env.STABILITY_BASE_URL?.trim().replace(/\/$/, "") ||
  "";

if (!base) {
  console.error(
    "deploy-verify: set DEPLOY_VERIFY_URL or HEALTH_CHECK_URL / STABILITY_BASE_URL to the deployed base URL"
  );
  process.exit(2);
}

const env = {
  ...process.env,
  HEALTH_CHECK_URL: base,
  STABILITY_BASE_URL: base,
};

function runNpmScript(name) {
  const r = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", name], {
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return r.status === 0;
}

const healthOk = runNpmScript("health:check");
const stabilityOk = runNpmScript("stability:run");

if (!healthOk || !stabilityOk) {
  const payload = {
    ok: false,
    at: new Date().toISOString(),
    baseUrl: base,
    healthCheck: healthOk,
    stabilityRun: stabilityOk,
    note: "Manual rollback or redeploy previous revision — see docs/deployments/rollback.md",
  };
  writeFileSync("rollback.json", JSON.stringify(payload, null, 2), "utf8");
  console.error("deploy-verify: FAILED — wrote rollback.json");
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, baseUrl: base, at: new Date().toISOString() }, null, 2));
process.exit(0);
