#!/usr/bin/env node
/**
 * Launch Prep Phase 3 — DNS / domain checklist for mycardarchive.com.
 *
 *   node scripts/dns-check.mjs
 *   node scripts/dns-check.mjs --resolve
 */

import { spawnSync } from "node:child_process";
import { lookup } from "node:dns/promises";

const APEX = "mycardarchive.com";
const WWW = `www.${APEX}`;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || `https://${APEX}`;

const args = new Set(process.argv.slice(2));
const doResolve = args.has("--resolve");

const checklist = {
  apex: {
    host: APEX,
    records: ["A or AAAA → Vercel", "ALIAS/ANAME if supported"],
  },
  www: {
    host: WWW,
    records: ["CNAME → cname.vercel-dns.com", "or redirect at Vercel"],
    redirect: `https://${APEX} (308 permanent)`,
  },
  canonical: {
    env: "NEXT_PUBLIC_SITE_URL",
    value: SITE_URL,
    note: "Must match apex HTTPS URL without trailing slash",
  },
  embed: {
    env: "MCA_EMBED_ALLOWLIST",
    example: `https://${APEX},https://${WWW}`,
    cors: "frame-ancestors via next.config embed headers",
  },
  vercel: [
    "Add apex + www domains in Vercel project",
    "Enable automatic HTTPS",
    "Set production env vars from .env.local.example",
  ],
};

async function resolveHost(host) {
  try {
    const v4 = await lookup(host, { family: 4 });
    return { ok: true, address: v4.address };
  } catch (e) {
    return { ok: false, error: String(e.message ?? e) };
  }
}

async function main() {
  const report = { checklist, resolves: null, at: new Date().toISOString() };

  if (doResolve) {
    report.resolves = {
      apex: await resolveHost(APEX),
      www: await resolveHost(WWW),
    };
  }

  const siteOk = SITE_URL === `https://${APEX}` || SITE_URL.startsWith("https://");
  report.siteUrlValid = siteOk;

  console.log(JSON.stringify(report, null, 2));

  if (args.has("--curl")) {
    const curl = spawnSync(
      "curl",
      ["-sI", `https://${APEX}`],
      { encoding: "utf8", shell: process.platform === "win32" }
    );
    if (curl.stdout) console.error(curl.stdout.slice(0, 800));
  }

  process.exit(siteOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
