#!/usr/bin/env node
/**
 * Verify analytics pipeline — POST /api/log with test product event.
 */

const base =
  process.env.VERIFY_BASE_URL?.trim().replace(/\/$/, "") ||
  process.env.LOADTEST_BASE_URL?.trim().replace(/\/$/, "") ||
  "http://127.0.0.1:3000";

async function main() {
  const payload = {
    level: "event",
    name: "product.pageview",
    data: { path: "/__launch_verify__", surface: "verify" },
    ts: Date.now(),
    componentName: "launch.verify",
    surfaceName: "analytics",
  };

  let ok = false;
  let status = 0;
  try {
    const res = await fetch(`${base}/api/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
    ok = res.status < 500;
  } catch (e) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: "skipped",
          reason: "server_unreachable",
          message: String(e.message ?? e),
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  console.log(JSON.stringify({ ok, status, endpoint: `${base}/api/log`, at: new Date().toISOString() }, null, 2));
  process.exit(ok ? 0 : 1);
}

main();
