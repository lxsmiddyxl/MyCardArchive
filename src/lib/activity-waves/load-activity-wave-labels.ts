import type { Database } from "@/lib/supabase/types";
import { ensureActivityWavesFresh } from "@/lib/activity-waves/ensure-activity-waves-fresh";
import { platformHeadlineFromBand, waveBandToDisplayLabel } from "@/lib/activity-waves/band-labels";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityWaveEnrichmentContext = {
  setId?: string | null;
  clubId?: string | null;
};

function utcIsoDowAndHour(nowMs: number): { isoDow: number; hour: number } {
  const now = new Date(nowMs);
  const d = now.getUTCDay();
  const isoDow = d === 0 ? 7 : d;
  return { isoDow, hour: now.getUTCHours() };
}

export async function loadActivityWaveLabelsForBatch(
  supabase: SupabaseClient<Database>,
  ctx?: ActivityWaveEnrichmentContext | null,
  nowMs: number = Date.now()
): Promise<{
  platformActivityLabel: string | null;
  setActivityLabel: string | null;
  clubActivityLabel: string | null;
}> {
  try {
    await ensureActivityWavesFresh(supabase);
    const { isoDow, hour } = utcIsoDowAndHour(nowMs);

    const { data: plat } = await supabase.rpc("get_platform_activity_wave");
    const grid = Array.isArray(plat) ? plat : [];
    const cell = grid.find((r) => r.day_bucket === isoDow && r.hour_bucket === hour);
    const platformActivityLabel = cell?.wave_band ? platformHeadlineFromBand(cell.wave_band) : null;

    let setActivityLabel: string | null = null;
    const sid = ctx?.setId?.trim();
    if (sid) {
      const { data: sw } = await supabase.rpc("get_set_activity_wave", { p_set_id: sid });
      const rows = Array.isArray(sw) ? sw : [];
      const cur = rows.find((r) => r.hour_bucket === hour);
      setActivityLabel = cur?.wave_band ? `${waveBandToDisplayLabel(cur.wave_band)} · This set` : null;
    }

    let clubActivityLabel: string | null = null;
    const cid = ctx?.clubId?.trim();
    if (cid) {
      const { data: cw } = await supabase.rpc("get_club_activity_wave", { p_club_id: cid });
      const rows = Array.isArray(cw) ? cw : [];
      const cur = rows.find((r) => r.hour_bucket === hour);
      clubActivityLabel = cur?.wave_band ? `${waveBandToDisplayLabel(cur.wave_band)} · This club` : null;
    }

    return { platformActivityLabel, setActivityLabel, clubActivityLabel };
  } catch {
    return {
      platformActivityLabel: null,
      setActivityLabel: null,
      clubActivityLabel: null,
    };
  }
}
