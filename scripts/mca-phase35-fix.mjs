/**
 * Post-sweep fixes: invalid `mca-*.5` classes, gradients, outlines, light borders.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, out);
    } else if (ent.name.endsWith(".tsx") || ent.name.endsWith(".ts")) {
      if (p.includes(`${path.sep}styles${path.sep}tokens`)) continue;
      out.push(p);
    }
  }
  return out;
}

function fix(s) {
  s = s.replace(/py-mca-sm\.5/g, "py-mca-tight");
  s = s.replace(/px-mca-sm\.5/g, "px-mca-tight");
  s = s.replace(/py-mca-xs\.5/g, "py-mca-micro");
  s = s.replace(/px-mca-xs\.5/g, "px-mca-micro");
  s = s.replace(/gap-mca-xs\.5/g, "gap-mca-micro");

  s = s.replace(/\brounded-b-2xl\b/g, "rounded-b-mca-sheet");
  s = s.replace(/\bfrom-zinc-900\b/g, "from-mca-surface-elevated");
  s = s.replace(/\bto-zinc-950\b/g, "to-mca-surface");
  s = s.replace(/\bborder-t-emerald-500\b/g, "border-t-mca-focus");
  s = s.replace(/\bfocus-visible:outline-amber-400\b/g, "focus-visible:outline-mca-accent");
  s = s.replace(/\bfocus-visible:outline-zinc-500\b/g, "focus-visible:outline-mca-border-interactive");
  s = s.replace(/\bdecoration-zinc-600\b/g, "decoration-mca-hint");
  s = s.replace(/\bborder-zinc-200\b/g, "border-mca-border-light");
  s = s.replace(/\bborder-zinc-300\b/g, "border-mca-border-light-strong");
  s = s.replace(/\bbg-zinc-50\b/g, "bg-mca-surface-light");
  s = s.replace(/\bbg-zinc-100\b/g, "bg-mca-surface-paper");
  s = s.replace(/\bbg-zinc-200\b/g, "bg-mca-border-light");
  s = s.replace(/\bhover:bg-zinc-50\b/g, "hover:bg-mca-surface-light");
  s = s.replace(/\bhover:bg-zinc-100\b/g, "hover:bg-mca-surface-paper");
  s = s.replace(/\bhover:bg-zinc-200\b/g, "hover:bg-mca-border-light");
  s = s.replace(/\btext-emerald-700\b/g, "text-mca-success-bold");
  s = s.replace(/\btext-emerald-800\b/g, "text-mca-focus-soft");
  s = s.replace(/\btext-emerald-900\b/g, "text-mca-success-text");
  s = s.replace(/\btext-amber-700\b/g, "text-mca-accent-deep");
  s = s.replace(/\btext-amber-800\b/g, "text-mca-accent-border");
  s = s.replace(/\bborder-emerald-900\b/g, "border-mca-success-surface-border");
  s = s.replace(/\bbg-emerald-950\b/g, "bg-mca-success-surface");
  s = s.replace(/\bborder-amber-900\b/g, "border-mca-warning-surface-border");
  s = s.replace(/\bbg-amber-950\b/g, "bg-mca-warning-surface");
  s = s.replace(/\bborder-amber-700\b/g, "border-mca-accent-deep");
  s = s.replace(/\btext-emerald-200\b/g, "text-mca-success-ink");
  s = s.replace(/\btext-emerald-100\b/g, "text-mca-success-tint");
  s = s.replace(/\btext-amber-100\b/g, "text-mca-warning-tint");

  s = s.replace(/\bbg-emerald-100\b/g, "bg-mca-success-tint");
  s = s.replace(/\bbg-amber-100\b/g, "bg-mca-warning-tint");
  s = s.replace(/\btext-amber-900\b/g, "text-mca-warning-text");
  s = s.replace(/\bshadow-emerald-900\/(\d+)\b/g, "shadow-mca-success-surface/$1");

  s = s.replace(/\bvia-zinc-600\b/g, "via-mca-field-border");
  s = s.replace(/\bvia-zinc-700\b/g, "via-mca-border-subtle");
  s = s.replace(/\bto-amber-400\b/g, "to-mca-accent");
  s = s.replace(/\bfrom-amber-700\b/g, "from-mca-accent-deep");
  s = s.replace(/\bto-amber-600\b/g, "to-mca-accent-border");
  s = s.replace(/\bfrom-amber-600\b/g, "from-mca-accent-border");

  s = s.replace(/\bto-emerald-600\b/g, "to-mca-focus-soft");
  s = s.replace(/\bfrom-emerald-600\b/g, "from-mca-focus-soft");
  s = s.replace(/\boutline-amber-400\b/g, "outline-mca-accent");
  s = s.replace(/\boutline-amber-500\b/g, "outline-mca-accent-strong");

  s = s.replace(/\bbg-emerald-400\b/g, "bg-mca-success");
  s = s.replace(/\bshadow-emerald-900\b/g, "shadow-mca-success-surface");

  return s;
}

const files = walk(path.join(ROOT, "src"));
let n = 0;
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const next = fix(raw);
  if (next !== raw) {
    fs.writeFileSync(file, next, "utf8");
    n++;
    console.log(path.relative(ROOT, file));
  }
}
console.error(`Fixed ${n} files.`);
