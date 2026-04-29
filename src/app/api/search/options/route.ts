import { CLUB_CATALOG } from "@/lib/clubs/club-catalog";
import { listAllArchetypes } from "@/lib/play/archetype-catalog";
import { listAllFormats } from "@/lib/play/formats-catalog";
import { listFandomOptions } from "@/lib/fandom/fandom-catalog";
import { JOURNEY_CATALOG } from "@/lib/journeys/journey-catalog";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function GET_handler() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: rpcRaw, error } = await supabase.rpc("get_search_filter_options");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rpc = (rpcRaw ?? {}) as Record<string, unknown>;

  return NextResponse.json({
    playFormats: listAllFormats().map((f) => ({ id: f.formatId, label: f.displayName })),
    playArchetypes: listAllArchetypes().map((a) => ({ id: a.archetypeId, label: a.displayName })),
    fandomEras: listFandomOptions("era").map((o) => ({ id: o.id, label: o.displayName })),
    fandomSets: listFandomOptions("set").map((o) => ({ id: o.id, label: o.displayName })),
    fandomArtists: listFandomOptions("artist").map((o) => ({ id: o.id, label: o.displayName })),
    fandomCharacters: listFandomOptions("character").map((o) => ({ id: o.id, label: o.displayName })),
    fandomThemes: listFandomOptions("theme").map((o) => ({ id: o.id, label: o.displayName })),
    clubs: CLUB_CATALOG.map((c) => ({ id: c.clubId, label: c.displayName })),
    journeys: JOURNEY_CATALOG.map((j) => ({ id: j.journeyId, label: j.displayName })),
    seasonalEventIds: Array.isArray(rpc.seasonalEventIds)
      ? rpc.seasonalEventIds
      : ["spring_2026_collector", "summer_2026_scan_sprint", "holiday_2026_collector"],
    presenceStates: [
      { id: "online", label: "Online" },
      { id: "recent", label: "Recently active" },
      { id: "offline", label: "Away / offline" },
    ],
    valueBands: [
      { id: 0, label: "Band 0 — starter" },
      { id: 1, label: "Band 1" },
      { id: 2, label: "Band 2" },
      { id: 3, label: "Band 3 — high band" },
      { id: 4, label: "Band 4 — exceptional (coarse)" },
    ],
    tradeTiers: [
      { id: 0, label: "Tier 0" },
      { id: 1, label: "Tier 1 — trusted signals" },
      { id: 2, label: "Tier 2 — veteran" },
      { id: 3, label: "Tier 3 — top signals" },
    ],
    rarityProfiles: ["High-rarity heavy", "Unique-focused", "Bulk-focused", "Balanced"].map((s) => ({
      id: s,
      label: s,
    })),
    rpcExtras: rpc,
  });
}

export const GET = defineRouteSimple("GET /api/search/options", GET_handler);
