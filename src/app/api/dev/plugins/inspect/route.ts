import { DEV_PLUGIN_REGISTRY } from "@/lib/plugins/registry.dev";
import { loadPluginsFromRegistry } from "@/lib/plugins/plugin-loader";
import { mcaLog } from "@/lib/logging/mca-log-server";
import { defineRouteNoArgs } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler(): Promise<Response> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = loadPluginsFromRegistry(DEV_PLUGIN_REGISTRY);

  for (const p of result.plugins) {
    mcaLog.event(
      "plugin.load",
      { pluginId: p.id, version: p.version, capabilities: p.capabilities },
      { componentName: "api", surfaceName: "dev.plugins" }
    );
  }
  for (const e of result.errors) {
    mcaLog.event(
      "plugin.error",
      { pluginId: e.id, phase: "validate", message: e.error },
      { componentName: "api", surfaceName: "dev.plugins" }
    );
  }

  return NextResponse.json({
    registryVersion: "dev-0.1",
    loaded: result.plugins.map((p) => ({
      id: p.id,
      version: p.version,
      capabilities: p.capabilities,
    })),
    errors: result.errors,
  });
}

export const GET = defineRouteNoArgs("GET /api/dev/plugins/inspect", GET_handler);
