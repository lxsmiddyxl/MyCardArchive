/**
 * Wraps `export async function POST(request: Request)` with defineRouteSimple.
 * Skips files with defineRoute*, multiple exports, or auth/callback.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, "..", "src", "app", "api");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name === "route.ts") out.push(p);
  }
  return out;
}

function labelFor(filePath) {
  const rel = path.relative(apiRoot, filePath).replace(/\\/g, "/");
  const segs = rel.replace(/\/route\.ts$/, "").split("/");
  const parts = segs.map((s) =>
    s.startsWith("[") && s.endsWith("]") ? `[${s.slice(1, -1)}]` : s
  );
  return "/api/" + parts.join("/");
}

let n = 0;
for (const file of walk(apiRoot)) {
  if (file.replace(/\\/g, "/").includes("/api/auth/callback/")) continue;
  let s = fs.readFileSync(file, "utf8");
  if (
    s.includes("defineRouteSimple") ||
    s.includes("defineRoute(") ||
    s.includes("defineRouteNoArgs")
  ) {
    continue;
  }
  const exportCount = (s.match(/^export async function (GET|POST|PUT|PATCH|DELETE)/gm) || [])
    .length;
  if (exportCount !== 1) continue;

  const re = /^export async function POST\(request: Request\)\s*\{/m;
  if (!re.test(s)) continue;

  const label = labelFor(file);
  if (!s.includes('@/lib/server/api-route"')) {
    /** Insert after first complete `import … from "…";` (handles multi-line imports). */
    let insertAt = 0;
    const importRe = /import\s+[\s\S]*?\s+from\s+["'][^"']+["'];?/y;
    importRe.lastIndex = 0;
    const m = importRe.exec(s);
    if (m) insertAt = m.index + m[0].length;
    else insertAt = s.indexOf("\n") + 1;
    s =
      s.slice(0, insertAt) +
      `\nimport { defineRouteSimple } from "@/lib/server/api-route";` +
      s.slice(insertAt);
  }
  s = s.replace(re, "async function POST_handler(request: Request) {");
  s = s.trimEnd() + `\n\nexport const POST = defineRouteSimple("POST ${label}", POST_handler);\n`;
  fs.writeFileSync(file, s);
  console.log("wrapped POST", file);
  n++;
}
console.log("done POST wraps:", n);
