#!/usr/bin/env node
/**
 * Launch Prep Phase 3 — verify Supabase migrations, RLS, storage, email templates.
 * Run before production cutover (requires local migration files; remote checks need Supabase CLI).
 *
 *   node scripts/supabase-prepare.mjs
 */

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

const EXPECTED_MAX_MIGRATION = 119;
const STORAGE_BUCKETS_SPEC = ["profile-images", "binder-covers", "exports"];
const STORAGE_BUCKETS_REPO = ["avatars"];
const EMAIL_TEMPLATE_MARKERS = ["magic link", "reset", "recovery", "confirm"];

async function listMigrations() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql"));
  const numbers = files
    .map((f) => {
      const m = /^(\d+)_/.exec(f);
      return m ? Number(m[1]) : null;
    })
    .filter((n) => n !== null);
  return { files, numbers };
}

async function scanSqlForPatterns() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql"));
  let rlsCount = 0;
  let bucketHits = new Set();
  let emailHits = 0;
  for (const file of files) {
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    if (/enable row level security|create policy/i.test(sql)) rlsCount += 1;
    for (const b of STORAGE_BUCKETS_SPEC) {
      if (sql.includes(b)) bucketHits.add(b);
    }
    for (const b of STORAGE_BUCKETS_REPO) {
      if (sql.includes(`'${b}'`) || sql.includes(`"${b}"`) || sql.includes(`id, name, public`)) {
        if (sql.includes("storage.buckets")) bucketHits.add(b);
      }
    }
    const lower = sql.toLowerCase();
    if (EMAIL_TEMPLATE_MARKERS.some((t) => lower.includes(t))) emailHits += 1;
  }
  return { rlsCount, bucketHits: [...bucketHits], emailHits };
}

function migrationReadiness(numbers, files) {
  const highest = Math.max(...numbers, 0);
  const hasLatest = files.some((f) => f.startsWith(`${EXPECTED_MAX_MIGRATION}_`));
  const gaps = [];
  for (let i = 1; i <= EXPECTED_MAX_MIGRATION; i++) {
    if (!numbers.includes(i)) gaps.push(i);
  }
  return { highest, hasLatest, gapCount: gaps.length, gapsSample: gaps.slice(0, 15) };
}

async function main() {
  const { files, numbers } = await listMigrations();
  const readiness = migrationReadiness(numbers, files);
  const scan = await scanSqlForPatterns();

  const report = {
    ok: readiness.hasLatest && readiness.highest >= EXPECTED_MAX_MIGRATION,
    migrationFiles: files.length,
    highestMigration: readiness.highest,
    hasMigration119: readiness.hasLatest,
    numberedGaps: readiness.gapCount,
    gapSample: readiness.gapsSample,
    migrationsWithRlsOrPolicies: scan.rlsCount,
    storageBucketsFoundInMigrations: scan.bucketHits,
    storageBucketsSpec: STORAGE_BUCKETS_SPEC,
    storageNote:
      "Repo uses `avatars` bucket; rename or add profile-images, binder-covers, exports in Supabase dashboard if required.",
    emailTemplateMarkersInMigrations: scan.emailHits,
    manualSteps: [
      "Apply migrations: supabase db push (or link + migrate)",
      "Enable daily backups + PITR in Supabase project settings",
      "Configure Auth email templates (magic link, reset password) in Dashboard",
      "Set SUPABASE_SERVICE_ROLE_KEY on Vercel (server only)",
      "Set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ],
    at: new Date().toISOString(),
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
