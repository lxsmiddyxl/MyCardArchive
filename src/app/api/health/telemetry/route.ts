import { mcaLog } from "@/lib/logging/mca-log-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CTX = { componentName: "health", surfaceName: "telemetry" } as const;

export async function GET(): Promise<Response> {
  const timestamp = Date.now();
  const disabled = process.env.TELEMETRY_INGEST_DISABLED === "1";

  try {
    let ingestOk = false;
    if (!disabled) {
      const base =
        process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
        "http://127.0.0.1:3000";
      try {
        const res = await fetch(`${base}/api/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
          signal: AbortSignal.timeout(8000),
        });
        ingestOk = res.status === 400 || res.status === 401;
        if (!ingestOk) {
          mcaLog.error(
            "health.telemetry.ping",
            { status: res.status, message: "unexpected /api/log response" },
            CTX
          );
        }
      } catch (err) {
        mcaLog.error("health.telemetry.ping", { err }, CTX);
        ingestOk = false;
      }
    }

    const ok = !disabled && ingestOk;

    return NextResponse.json(
      {
        ok,
        ingestOk,
        disabled,
        timestamp,
      },
      { status: 200 }
    );
  } catch (err) {
    mcaLog.error("health.telemetry", { err }, CTX);
    return NextResponse.json(
      {
        ok: false,
        ingestOk: false,
        disabled,
        timestamp,
      },
      { status: 200 }
    );
  }
}
