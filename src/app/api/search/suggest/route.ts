import { CLUB_CATALOG } from "@/lib/clubs/club-catalog";
import { listAllArchetypes } from "@/lib/play/archetype-catalog";
import { listAllFormats } from "@/lib/play/formats-catalog";
import { listFandomOptions } from "@/lib/fandom/fandom-catalog";
import { normalizeSearchQuery } from "@/lib/search/search-filters";
import { defineRouteSimple } from "@/lib/server/api-route";
import { createClient } from "@/lib/supabase/route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Suggestion = { kind: string; id: string; label: string };

function score(q: string, label: string, id: string): boolean {
  const n = q.toLowerCase();
  return (
    label.toLowerCase().includes(n) ||
    id.toLowerCase().includes(n) ||
    label.toLowerCase().startsWith(n)
  );
}

async function GET_handler(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const q = normalizeSearchQuery(url.searchParams.get("q") ?? "").slice(0, 80);
  if (!q) {
    return NextResponse.json({ suggestions: [] as Suggestion[] });
  }

  const out: Suggestion[] = [];

  for (const f of listAllFormats()) {
    if (out.length >= 16) break;
    if (score(q, f.displayName, f.formatId)) {
      out.push({ kind: "playFormatId", id: f.formatId, label: `${f.displayName} (format)` });
    }
  }
  for (const a of listAllArchetypes()) {
    if (out.length >= 16) break;
    if (score(q, a.displayName, a.archetypeId)) {
      out.push({ kind: "playArchetypeId", id: a.archetypeId, label: `${a.displayName} (archetype)` });
    }
  }
  for (const kind of ["set", "artist", "character", "theme", "era"] as const) {
    for (const o of listFandomOptions(kind)) {
      if (out.length >= 20) break;
      if (score(q, o.displayName, o.id)) {
        const fk =
          kind === "set"
            ? "fandomSetId"
            : kind === "era"
              ? "fandomEraId"
              : kind === "artist"
                ? "fandomArtistId"
                : kind === "character"
                  ? "fandomCharacterId"
                  : "fandomThemeId";
        out.push({ kind: fk, id: o.id, label: `${o.displayName} (${kind})` });
      }
    }
  }
  for (const c of CLUB_CATALOG) {
    if (out.length >= 24) break;
    if (score(q, c.displayName, c.clubId)) {
      out.push({ kind: "clubIds", id: c.clubId, label: `${c.displayName} (club)` });
    }
  }

  return NextResponse.json({ suggestions: out.slice(0, 24) });
}

export const GET = defineRouteSimple("GET /api/search/suggest", GET_handler);
