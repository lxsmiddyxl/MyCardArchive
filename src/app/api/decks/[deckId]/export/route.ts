import { fetchOwnedDeck } from "@/lib/decks/ownership";
import {
  formatDeckExportLine,
  type ExportFormat,
} from "@/lib/decks/deck-list-io";
import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FORMATS = new Set<ExportFormat>(["tcgplayer", "showdown", "txt", "mtgo"]);

type CardRow = {
  name: string;
  quantity: number;
};

function firstRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type DeckCardRow = {
  quantity: number;
  section: string;
  cards: { name: string } | { name: string }[] | null;
};

function zoneLines(
  rows: DeckCardRow[],
  format: ExportFormat
): string[] {
  const list: CardRow[] = [];
  for (const row of rows) {
    const c = firstRelation(row.cards);
    if (!c?.name) continue;
    list.push({ name: c.name, quantity: row.quantity });
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list.map((r) => formatDeckExportLine(r.name, r.quantity, format));
}

async function GET_handler(
  request: Request,
  context: { params: Record<string, string> }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deckId = context.params["deckId"]?.trim();
  if (!deckId) {
    return NextResponse.json({ error: "deckId is required" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const formatRaw = (searchParams.get("format") ?? "tcgplayer").toLowerCase();
  if (!FORMATS.has(formatRaw as ExportFormat)) {
    return NextResponse.json(
      { error: "format must be tcgplayer, showdown, txt, or mtgo" },
      { status: 400 }
    );
  }
  const format = formatRaw as ExportFormat;

  const { data: deck, error: deckErr } = await fetchOwnedDeck(
    supabase,
    user.id,
    deckId
  );
  if (deckErr || !deck) {
    return NextResponse.json(
      { error: deckErr?.message ?? "Deck not found" },
      { status: deckErr ? 500 : 404 }
    );
  }

  const { data, error } = await supabase
    .from("deck_cards")
    .select("quantity, section, cards(name)")
    .eq("deck_id", deckId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bySection: Record<string, DeckCardRow[]> = {
    main: [],
    sideboard: [],
    commander: [],
  };
  for (const row of (data ?? []) as DeckCardRow[]) {
    const sec = (row.section ?? "main").toLowerCase();
    if (sec in bySection) {
      bySection[sec].push(row);
    } else {
      bySection.main.push(row);
    }
  }

  const blocks: string[] = [];
  const mainBlock = zoneLines(bySection.main, format);
  if (mainBlock.length) blocks.push(mainBlock.join("\n"));
  const sideBlock = zoneLines(bySection.sideboard, format);
  if (sideBlock.length) blocks.push(sideBlock.join("\n"));
  const cmdBlock = zoneLines(bySection.commander, format);
  if (cmdBlock.length) blocks.push(cmdBlock.join("\n"));

  const body = blocks.join("\n\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = defineRoute("GET /api/decks/[deckId]/export", GET_handler);
