#!/usr/bin/env node
/**
 * Aggregate error summary for admin /admin/errors UI.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_REPO = join(ROOT, "analytics", "errors");
const OUT_PUBLIC = join(ROOT, "public", "analytics", "errors");

function main() {
  const summary = {
    generatedAt: new Date().toISOString(),
    total: 0,
    byRoute: [],
    recent: [],
    note: "Wire to log drain / Sentry export for live data; seed for launch UI.",
  };

  mkdirSync(OUT_REPO, { recursive: true });
  mkdirSync(OUT_PUBLIC, { recursive: true });
  const payload = JSON.stringify(summary, null, 2);
  writeFileSync(join(OUT_REPO, "summary.json"), payload, "utf8");
  writeFileSync(join(OUT_PUBLIC, "summary.json"), payload, "utf8");
  console.log(JSON.stringify({ ok: true, written: OUT_PUBLIC }, null, 2));
}

main();
