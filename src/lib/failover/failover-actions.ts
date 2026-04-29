import "server-only";

import { mcaLog } from "@/lib/logging/mca-log-server";
import {
  getPrimaryRegion,
  getSecondaryRegion,
  getSiteUrlForRegion,
  getSupabaseUrlForRegion,
} from "@/lib/regions/region-config";
import { getActiveRegion, setActiveRegion } from "@/lib/regions/region-state";

const CTX = { componentName: "failover", surfaceName: "actions" } as const;

export type FailoverActionFn = (context: Record<string, unknown>) => Promise<void>;

export const FailoverRegistry = new Map<string, FailoverActionFn>();

export function registerFailoverAction(name: string, fn: FailoverActionFn): void {
  FailoverRegistry.set(name, fn);
}

export async function runFailoverActions(context: Record<string, unknown>): Promise<void> {
  for (const [name, fn] of FailoverRegistry.entries()) {
    await fn({ ...context, action: name });
  }
}

/** Idempotent: records intent. Live Supabase URLs remain deploy-time; runtime uses region-state + future client reads. */
async function supabaseFailoverAction(ctx: Record<string, unknown>): Promise<void> {
  const phase = ctx.phase === "failback" ? "failback" : "failover";
  const primary = getPrimaryRegion();
  const secondary = getSecondaryRegion();
  mcaLog.event(
    "failover.action.supabase",
    {
      phase,
      primaryUrlPresent: Boolean(getSupabaseUrlForRegion(primary)),
      secondaryUrlPresent: Boolean(secondary && getSupabaseUrlForRegion(secondary)),
      note: "Logical region switch; rotate env + redeploy for durable URL change",
    },
    CTX
  );
}

async function telemetryFailoverAction(ctx: Record<string, unknown>): Promise<void> {
  const phase = ctx.phase === "failback" ? "failback" : "failover";
  const primary = getPrimaryRegion();
  const secondary = getSecondaryRegion();
  mcaLog.event(
    "failover.action.telemetry",
    {
      phase,
      primarySite: getSiteUrlForRegion(primary),
      secondarySite: secondary ? getSiteUrlForRegion(secondary) : null,
    },
    CTX
  );
}

async function realtimeFailoverAction(ctx: Record<string, unknown>): Promise<void> {
  const phase = ctx.phase === "failback" ? "failback" : "failover";
  mcaLog.event(
    "failover.action.realtime",
    {
      phase,
      note: "Clients should reconnect WebSocket channels to new project host after deploy",
    },
    CTX
  );
}

async function regionStateUpdateAction(ctx: Record<string, unknown>): Promise<void> {
  const phase = ctx.phase === "failback" ? "failback" : "failover";
  const primary = getPrimaryRegion();
  const secondary = getSecondaryRegion();
  let setOk = false;
  if (phase === "failover" && secondary) {
    setOk = setActiveRegion(secondary);
  } else if (phase === "failback") {
    setOk = setActiveRegion(primary);
  }
  mcaLog.event(
    "failover.action.region_state",
    { phase, activeRegion: getActiveRegion(), setOk },
    CTX
  );
}

registerFailoverAction("supabaseFailoverAction", supabaseFailoverAction);
registerFailoverAction("telemetryFailoverAction", telemetryFailoverAction);
registerFailoverAction("realtimeFailoverAction", realtimeFailoverAction);
registerFailoverAction("regionStateUpdateAction", regionStateUpdateAction);
