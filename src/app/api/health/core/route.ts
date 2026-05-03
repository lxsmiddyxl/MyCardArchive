import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";
import pkg from "../../../../../package.json";

export const dynamic = "force-dynamic";

const CTX = { componentName: "health", surfaceName: "core" } as const;

async function GET_handler(): Promise<Response> {
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

export const GET = defineRouteNoArgs("GET /api/health/core", GET_handler);
