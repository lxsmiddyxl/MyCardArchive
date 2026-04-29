import "server-only";

import { getAnonKeyForRegion, getSiteUrlForRegion, getSupabaseUrlForRegion } from "@/lib/regions/region-config";

export type RegionPingResult = {
  ok: boolean;
  region: string;
  latencyMs: number;
  timestamp: number;
  detail?: string;
};

async function timedFetch(
  regionId: string,
  fn: () => Promise<boolean>
): Promise<RegionPingResult> {
  const t0 = performance.now();
  const timestamp = Date.now();
  try {
    const ok = await fn();
    const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
    return { ok, region: regionId, latencyMs, timestamp };
  } catch {
    const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
    return { ok: false, region: regionId, latencyMs, timestamp, detail: "exception" };
  }
}

/** PostgREST reachability for the region's Supabase project. */
export async function pingSupabaseRestForRegion(region: string): Promise<RegionPingResult> {
  const url = getSupabaseUrlForRegion(region);
  const anon = getAnonKeyForRegion(region);
  if (!url || !anon) {
    return {
      ok: false,
      region,
      latencyMs: 0,
      timestamp: Date.now(),
      detail: "missing_url_or_anon",
    };
  }
  return timedFetch(region, async () => {
    const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    return res.status < 500;
  });
}

/**
 * Auth / edge health (distinct from PostgREST). Supabase exposes `/auth/v1/health` on project hosts.
 */
export async function pingRealtimeForRegion(region: string): Promise<RegionPingResult> {
  const url = getSupabaseUrlForRegion(region);
  const anon = getAnonKeyForRegion(region);
  if (!url || !anon) {
    return {
      ok: false,
      region,
      latencyMs: 0,
      timestamp: Date.now(),
      detail: "missing_url_or_anon",
    };
  }
  return timedFetch(region, async () => {
    const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok || res.status === 404;
  });
}

/** Telemetry ingest path health for the region's public app URL. */
export async function pingTelemetryForRegion(region: string): Promise<RegionPingResult> {
  const base = getSiteUrlForRegion(region);
  return timedFetch(region, async () => {
    const res = await fetch(`${base}/api/health/telemetry`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return false;
    const j = (await res.json()) as { ok?: boolean };
    return j?.ok === true;
  });
}
