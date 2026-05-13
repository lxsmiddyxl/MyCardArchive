#!/usr/bin/env node
/**
 * Pre-launch gate: typecheck, lint, unit tests, production build.
 * Optional: E2E smoke when PLAYWRIGHT_BASE_URL + server already running.
 *
 *   node scripts/launch-check.mjs
 *   node scripts/launch-check.mjs --no-build
 */

import { spawnSync } from "node:child_process";

const args = new Set(process.argv.slice(2));
const noBuild = args.has("--no-build");

function run(cmd, npmArgs) {
  const r = spawnSync(cmd, npmArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  return r.status === 0;
}

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const steps = [
  ["typecheck", () => run(npm, ["run", "typecheck"])],
  ["lint", () => run(npm, ["run", "lint"])],
  ["test:unit", () => run(npm, ["run", "test:unit"])],
];

if (!noBuild) {
  steps.push(["build", () => run(npm, ["run", "build"])]);
}

for (const [name, fn] of steps) {
  console.error(`[launch-check] → ${name}`);
  if (!fn()) {
    console.error(`[launch-check] FAILED at step: ${name}`);
    process.exit(1);
  }
}

console.log(JSON.stringify({ ok: true, at: new Date().toISOString(), noBuild }, null, 2));
process.exit(0);
