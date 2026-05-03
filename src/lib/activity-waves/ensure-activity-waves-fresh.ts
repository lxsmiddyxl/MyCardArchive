import type { Database } from "@/lib/supabase/types";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";

const STALE_MS = 14 * 60 * 1000;

/**
 * Refreshes coarse aggregates when stale (Phase 27).
 * Uses service role when available; safe to call from route handlers.
 */
export async function ensureActivityWavesFresh(
  routeClient: SupabaseClient<Database>
): Promise<void> {
  const { data: meta } = await routeClient
    .from("collector_activity_wave_meta")
    .select("last_refresh_at")
    .eq("id", 1)
    .maybeSingle();

  const last = meta?.last_refresh_at ? Date.parse(meta.last_refresh_at) : 0;
  if (last > 0 && Date.now() - last < STALE_MS) {
    return;
  }

  const svc = createServiceRoleClient();
  if (svc) {
    await svc.rpc("refresh_activity_waves");
    return;
  }

  await routeClient.rpc("refresh_activity_waves");
}
