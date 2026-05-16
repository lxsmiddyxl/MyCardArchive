#!/usr/bin/env node
/**
 * Generate analytics dashboard config JSON for admin UI.
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ANALYTICS_DIR = join(ROOT, "analytics", "dashboards");
const PUBLIC_DIR = join(ROOT, "public", "analytics", "dashboards");

const DASHBOARDS = [
  {
    id: "onboarding",
    title: "Onboarding funnel",
    description: "Signup through onboarding complete",
    metrics: [
      { label: "Signup started", event: "auth.signup", value: 0 },
      { label: "Onboarding step", event: "onboarding_step", value: 0 },
      { label: "Onboarding complete", event: "onboarding_step", value: 0 },
    ],
  },
  {
    id: "binder-interactions",
    title: "Binder interactions",
    description: "Opens, page changes, slot views",
    metrics: [
      { label: "Binder open", event: "analytics.binder_open", value: 0 },
      { label: "Page change", event: "analytics.binder_page_change", value: 0 },
      { label: "Slot view", event: "analytics.binder_slot_view", value: 0 },
    ],
  },
  {
    id: "scans",
    title: "Scan success rate",
    description: "Scan success vs failure",
    metrics: [
      { label: "Scan success", event: "analytics.scan_success", value: 0 },
      { label: "Scan failure", event: "analytics.scan_failure", value: 0 },
    ],
  },
  {
    id: "public-views",
    title: "Public & embed views",
    description: "Public binder, embed, profile views",
    metrics: [
      { label: "Public binder", event: "analytics.public_binder_view", value: 0 },
      { label: "Embed view", event: "analytics.embed_view", value: 0 },
      { label: "Profile view", event: "analytics.profile_view", value: 0 },
    ],
  },
];

function main() {
  mkdirSync(ANALYTICS_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  for (const d of DASHBOARDS) {
    const payload = JSON.stringify(d, null, 2);
    const repoPath = join(ANALYTICS_DIR, `${d.id}.json`);
    const pubPath = join(PUBLIC_DIR, `${d.id}.json`);
    writeFileSync(repoPath, payload, "utf8");
    if (!existsSync(pubPath) || process.env.ANALYTICS_DASHBOARD_OVERWRITE === "1") {
      writeFileSync(pubPath, payload, "utf8");
    }
  }

  console.log(JSON.stringify({ ok: true, count: DASHBOARDS.length, out: ANALYTICS_DIR }, null, 2));
}

main();
