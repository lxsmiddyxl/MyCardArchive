/**
 * Phase 35: replace hardcoded Tailwind with mca-* tokens in src/components + src/app.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGETS = [path.join(ROOT, "src/components"), path.join(ROOT, "src/app")];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, out);
    } else if (ent.name.endsWith(".tsx") || ent.name.endsWith(".ts")) {
      out.push(p);
    }
  }
  return out;
}

function apply(content) {
  let s = content;

  /** @param {RegExp|string} re @param {string} b */
  function rep(re, b) {
    if (typeof re === "string") s = s.split(re).join(b);
    else s = s.replace(re, b);
  }

  // Order: longer border shades first
  rep(/\bborder-zinc-800\b/g, "border-mca-border");
  rep(/\bborder-zinc-700\b/g, "border-mca-border-subtle");
  rep(/\bborder-zinc-600\b/g, "border-mca-field-border");
  rep(/\bborder-zinc-500\b/g, "border-mca-border-interactive");
  rep(/\bdivide-zinc-800\b/g, "divide-mca-border");
  rep(/\bdivide-zinc-700\b/g, "divide-mca-border-subtle");
  rep(/\bdivide-zinc-600\b/g, "divide-mca-field-border");

  rep(/\bring-zinc-600\b/g, "ring-mca-field-border");
  rep(/\bring-zinc-700\b/g, "ring-mca-border-subtle");
  rep(/\bring-offset-zinc-950\b/g, "ring-offset-mca-surface");
  rep(/\bring-offset-zinc-900\b/g, "ring-offset-mca-surface-elevated");

  rep(/\bfrom-zinc-700\b/g, "from-mca-border-subtle");
  rep(/\bto-zinc-800\b/g, "to-mca-chrome");
  rep(/\bfrom-zinc-800\b/g, "from-mca-chrome");
  rep(/\bto-zinc-900\b/g, "to-mca-surface-elevated");
  rep(/\bvia-zinc-800\b/g, "via-mca-chrome");

  rep(/\bbg-zinc-950\b/g, "bg-mca-surface");
  rep(/\bbg-zinc-900\b/g, "bg-mca-surface-elevated");
  rep(/\bbg-zinc-800\b/g, "bg-mca-chrome");
  rep(/\bbg-zinc-700\b/g, "bg-mca-border-subtle");

  rep(/\btext-zinc-50\b/g, "text-mca-ink");
  rep(/\btext-zinc-100\b/g, "text-mca-ink-strong");
  rep(/\btext-zinc-200\b/g, "text-mca-ink-soft");
  rep(/\btext-zinc-300\b/g, "text-mca-ink-body");
  rep(/\btext-zinc-400\b/g, "text-mca-ink-muted");
  rep(/\btext-zinc-500\b/g, "text-mca-ink-subtle");
  rep(/\btext-zinc-600\b/g, "text-mca-hint");
  rep(/\btext-zinc-700\b/g, "text-mca-border-subtle");
  rep(/\btext-zinc-800\b/g, "text-mca-chrome");
  rep(/\btext-zinc-900\b/g, "text-mca-surface-elevated");
  rep(/\btext-zinc-950\b/g, "text-mca-on-accent");

  rep(/\btext-emerald-300\b/g, "text-mca-success-soft");
  rep(/\btext-emerald-400\b/g, "text-mca-success");
  rep(/\btext-emerald-500\b/g, "text-mca-success-bold");
  rep(/\btext-emerald-600\b/g, "text-mca-focus-soft");
  rep(/\bbg-emerald-500\b/g, "bg-mca-success-bold");
  rep(/\bbg-emerald-600\b/g, "bg-mca-focus-soft");
  rep(/\bborder-emerald-500\b/g, "border-mca-focus");
  rep(/\bborder-emerald-600\b/g, "border-mca-focus-soft");
  rep(/\bring-emerald-500\b/g, "ring-mca-focus");
  rep(/\bring-emerald-400\b/g, "ring-mca-success");
  rep(/\bfocus:border-emerald-500\/40\b/g, "focus:border-mca-focus/40");
  rep(/\bfocus:border-emerald-600\/40\b/g, "focus:border-mca-focus-soft/40");
  rep(/\bfocus:ring-emerald-500\b/g, "focus:ring-mca-focus");
  rep(/\bfocus:ring-emerald-500\/35\b/g, "focus:ring-mca-focus/35");
  rep(/\bfocus-visible:ring-emerald-500\b/g, "focus-visible:ring-mca-focus");
  rep(/\bfocus-visible:ring-emerald-500\/50\b/g, "focus-visible:ring-mca-focus/50");
  rep(/\bfocus-visible:ring-emerald-500\/60\b/g, "focus-visible:ring-mca-focus/60");

  s = s.replace(/\bbg-emerald-500\/(\d+)\b/g, "bg-mca-success-bold/$1");
  s = s.replace(/\bbg-emerald-600\/(\d+)\b/g, "bg-mca-focus-soft/$1");
  s = s.replace(/\bring-emerald-500\/(\d+)\b/g, "ring-mca-focus/$1");

  rep(/\btext-amber-200\b/g, "text-mca-nav-accent");
  rep(/\btext-amber-300\b/g, "text-mca-accent-highlight");
  rep(/\btext-amber-400\b/g, "text-mca-accent");
  rep(/\btext-amber-500\b/g, "text-mca-accent-strong");
  rep(/\btext-amber-600\b/g, "text-mca-accent-border");
  rep(/\bbg-amber-400\b/g, "bg-mca-accent");
  rep(/\bbg-amber-500\b/g, "bg-mca-accent-strong");
  rep(/\bbg-amber-600\b/g, "bg-mca-accent-border");
  rep(/\bborder-amber-500\b/g, "border-mca-accent-strong");
  rep(/\bborder-amber-600\b/g, "border-mca-accent-border");
  rep(/\bborder-amber-500\/40\b/g, "border-mca-accent-strong/40");
  rep(/\bhover:border-amber-500\/40\b/g, "hover:border-mca-accent-strong/40");
  rep(/\bring-amber-400\b/g, "ring-mca-accent");
  rep(/\bring-amber-500\b/g, "ring-mca-accent-strong");
  rep(/\bfrom-amber-500\b/g, "from-mca-accent-strong");
  rep(/\bto-amber-600\b/g, "to-mca-accent-border");
  rep(/\bhover:text-amber-300\b/g, "hover:text-mca-accent-highlight");
  rep(/\bhover:text-amber-400\b/g, "hover:text-mca-accent");
  rep(/\bhover:bg-amber-400\b/g, "hover:bg-mca-accent");
  rep(/\bhover:bg-amber-500\b/g, "hover:bg-mca-accent-strong");

  s = s.replace(/\bbg-amber-500\/(\d+)\b/g, "bg-mca-accent-strong/$1");
  s = s.replace(/\bbg-amber-400\/(\d+)\b/g, "bg-mca-accent/$1");

  rep(/\brounded-md\b/g, "rounded-mca-control");
  rep(/\brounded-lg\b/g, "rounded-mca-block");
  rep(/\brounded-xl\b/g, "rounded-mca-card");
  rep(/\brounded-2xl\b/g, "rounded-mca-sheet");

  rep(/\bshadow-sm\b/g, "shadow-mca-panel");
  rep(/\bshadow-md\b/g, "shadow-mca-panel");
  rep(/\bshadow-lg\b/g, "shadow-mca-card");
  rep(/\bshadow-xl\b/g, "shadow-mca-card");
  rep(/\bshadow-2xl\b/g, "shadow-mca-card");

  const spacingRules = [
    [/\bspace-y-2\b/g, "space-y-mca-sm"],
    [/\bspace-x-2\b/g, "space-x-mca-sm"],
    [/\bspace-y-3\b/g, "space-y-mca-compact"],
    [/\bspace-x-3\b/g, "space-x-mca-compact"],
    [/\bgap-1\b/g, "gap-mca-xs"],
    [/\bgap-2\b/g, "gap-mca-sm"],
    [/\bgap-3\b/g, "gap-mca-compact"],
    [/\bgap-4\b/g, "gap-mca-base"],
    [/\bgap-5\b/g, "gap-mca-comfortable"],
    [/\bgap-6\b/g, "gap-mca-lg"],
    [/\bgap-8\b/g, "gap-mca-xl"],
  ];

  const simple = [
    [/\bp-1\b/g, "p-mca-xs"],
    [/\bpx-1\b/g, "px-mca-xs"],
    [/\bpy-1\b/g, "py-mca-xs"],
    [/\bpt-1\b/g, "pt-mca-xs"],
    [/\bpb-1\b/g, "pb-mca-xs"],
    [/\bps-1\b/g, "ps-mca-xs"],
    [/\bpe-1\b/g, "pe-mca-xs"],
    [/\bm-1\b/g, "m-mca-xs"],
    [/\bmx-1\b/g, "mx-mca-xs"],
    [/\bmy-1\b/g, "my-mca-xs"],
    [/\bmt-1\b/g, "mt-mca-xs"],
    [/\bmb-1\b/g, "mb-mca-xs"],
    [/\bms-1\b/g, "ms-mca-xs"],
    [/\bme-1\b/g, "me-mca-xs"],
    [/\bp-2\b/g, "p-mca-sm"],
    [/\bpx-2\b/g, "px-mca-sm"],
    [/\bpy-2\b/g, "py-mca-sm"],
    [/\bpt-2\b/g, "pt-mca-sm"],
    [/\bpb-2\b/g, "pb-mca-sm"],
    [/\bps-2\b/g, "ps-mca-sm"],
    [/\bpe-2\b/g, "pe-mca-sm"],
    [/\bm-2\b/g, "m-mca-sm"],
    [/\bmx-2\b/g, "mx-mca-sm"],
    [/\bmy-2\b/g, "my-mca-sm"],
    [/\bmt-2\b/g, "mt-mca-sm"],
    [/\bmb-2\b/g, "mb-mca-sm"],
    [/\bms-2\b/g, "ms-mca-sm"],
    [/\bme-2\b/g, "me-mca-sm"],
    [/\bp-3\b/g, "p-mca-compact"],
    [/\bpx-3\b/g, "px-mca-compact"],
    [/\bpy-3\b/g, "py-mca-compact"],
    [/\bpt-3\b/g, "pt-mca-compact"],
    [/\bpb-3\b/g, "pb-mca-compact"],
    [/\bps-3\b/g, "ps-mca-compact"],
    [/\bpe-3\b/g, "pe-mca-compact"],
    [/\bm-3\b/g, "m-mca-compact"],
    [/\bmx-3\b/g, "mx-mca-compact"],
    [/\bmy-3\b/g, "my-mca-compact"],
    [/\bmt-3\b/g, "mt-mca-compact"],
    [/\bmb-3\b/g, "mb-mca-compact"],
    [/\bms-3\b/g, "ms-mca-compact"],
    [/\bme-3\b/g, "me-mca-compact"],
    [/\bp-4\b/g, "p-mca-base"],
    [/\bpx-4\b/g, "px-mca-base"],
    [/\bpy-4\b/g, "py-mca-base"],
    [/\bpt-4\b/g, "pt-mca-base"],
    [/\bpb-4\b/g, "pb-mca-base"],
    [/\bps-4\b/g, "ps-mca-base"],
    [/\bpe-4\b/g, "pe-mca-base"],
    [/\bm-4\b/g, "m-mca-base"],
    [/\bmx-4\b/g, "mx-mca-base"],
    [/\bmy-4\b/g, "my-mca-base"],
    [/\bmt-4\b/g, "mt-mca-base"],
    [/\bmb-4\b/g, "mb-mca-base"],
    [/\bms-4\b/g, "ms-mca-base"],
    [/\bme-4\b/g, "me-mca-base"],
    [/\bp-5\b/g, "p-mca-comfortable"],
    [/\bpx-5\b/g, "px-mca-comfortable"],
    [/\bpy-5\b/g, "py-mca-comfortable"],
    [/\bpt-5\b/g, "pt-mca-comfortable"],
    [/\bpb-5\b/g, "pb-mca-comfortable"],
    [/\bps-5\b/g, "ps-mca-comfortable"],
    [/\bpe-5\b/g, "pe-mca-comfortable"],
    [/\bm-5\b/g, "m-mca-comfortable"],
    [/\bmx-5\b/g, "mx-mca-comfortable"],
    [/\bmy-5\b/g, "my-mca-comfortable"],
    [/\bmt-5\b/g, "mt-mca-comfortable"],
    [/\bmb-5\b/g, "mb-mca-comfortable"],
    [/\bms-5\b/g, "ms-mca-comfortable"],
    [/\bme-5\b/g, "me-mca-comfortable"],
    [/\bp-6\b/g, "p-mca-lg"],
    [/\bpx-6\b/g, "px-mca-lg"],
    [/\bpy-6\b/g, "py-mca-lg"],
    [/\bpt-6\b/g, "pt-mca-lg"],
    [/\bpb-6\b/g, "pb-mca-lg"],
    [/\bps-6\b/g, "ps-mca-lg"],
    [/\bpe-6\b/g, "pe-mca-lg"],
    [/\bm-6\b/g, "m-mca-lg"],
    [/\bmx-6\b/g, "mx-mca-lg"],
    [/\bmy-6\b/g, "my-mca-lg"],
    [/\bmt-6\b/g, "mt-mca-lg"],
    [/\bmb-6\b/g, "mb-mca-lg"],
    [/\bms-6\b/g, "ms-mca-lg"],
    [/\bme-6\b/g, "me-mca-lg"],
    [/\bp-8\b/g, "p-mca-xl"],
    [/\bpx-8\b/g, "px-mca-xl"],
    [/\bpy-8\b/g, "py-mca-xl"],
    [/\bpt-8\b/g, "pt-mca-xl"],
    [/\bpb-8\b/g, "pb-mca-xl"],
    [/\bps-8\b/g, "ps-mca-xl"],
    [/\bpe-8\b/g, "pe-mca-xl"],
    [/\bmt-8\b/g, "mt-mca-xl"],
    [/\bmb-8\b/g, "mb-mca-xl"],
    [/\bmx-8\b/g, "mx-mca-xl"],
    [/\bmy-8\b/g, "my-mca-xl"],
    [/\bm-8\b/g, "m-mca-xl"],
    [/\bms-8\b/g, "ms-mca-xl"],
    [/\bme-8\b/g, "me-mca-xl"],
  ];
  for (const [re, b] of simple) rep(re, b);

  for (const [re, repl] of spacingRules) s = s.replace(re, repl);

  return s;
}

const files = TARGETS.flatMap((d) => walk(d));
let n = 0;
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const next = apply(raw);
  if (next !== raw) {
    fs.writeFileSync(file, next, "utf8");
    n++;
    console.log(path.relative(ROOT, file));
  }
}
console.error(`Updated ${n} files.`);
