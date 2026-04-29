/**
 * One-off maintainer script: wraps `export async function GET(request: Request)` handlers
 * with defineRouteSimple. Skips files that already use defineRoute* or have multiple exports.
 * Run: node scripts/wrap-api-get-handlers.mjs
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

  const re = /^export async function GET\(request: Request\)\s*\{/m;
  if (!re.test(s)) continue;

  const label = labelFor(file);
  if (!s.includes('@/lib/server/api-route"')) {
    const firstNl = s.indexOf("\n");
    s =
      s.slice(0, firstNl + 1) +
      `import { defineRouteSimple } from "@/lib/server/api-route";\n` +
      s.slice(firstNl + 1);
  }
  s = s.replace(re, "async function GET_handler(request: Request) {");
  s = s.trimEnd() + `\n\nexport const GET = defineRouteSimple("GET ${label}", GET_handler);\n`;
  fs.writeFileSync(file, s);
  console.log("wrapped", file);
  n++;
}
console.log("done, wrapped", n, "files");
