import { mcaLog } from "@/lib/logging/mca-log-server";
import { NextResponse } from "next/server";
import pkg from "../../../../../package.json";

export const dynamic = "force-dynamic";

const CTX = { componentName: "health", surfaceName: "core" } as const;

export async function GET(): Promise<Response> {
  const timestamp = Date.now();
  try {
    const nodeEnv = process.env.NODE_ENV ?? "unknown";
    return NextResponse.json(
      {
        ok: true,
        version: typeof pkg.version === "string" ? pkg.version : "0.0.0",
        uptime: process.uptime(),
        env: nodeEnv,
        timestamp,
      },
      { status: 200 }
    );
  } catch (err) {
    mcaLog.error("health.core", { err }, CTX);
    return NextResponse.json(
      {
        ok: false,
        version: "unknown",
        uptime: process.uptime(),
        env: process.env.NODE_ENV ?? "unknown",
        timestamp,
      },
      { status: 200 }
    );
  }
}
