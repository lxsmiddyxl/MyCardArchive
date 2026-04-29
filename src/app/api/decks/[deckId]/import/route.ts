import { fetchOwnedDeck } from "@/lib/decks/ownership";
import {
  matchCardName,
  parseDeckListTextWithDisplayNames,
} from "@/lib/decks/deck-list-io";
import { createClient } from "@/lib/supabase/route";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Zone = "main" | "sideboard" | "commander";
const ALLOWED_ZONES = new Set<Zone>(["main", "sideboard", "commander"]);

type Body = {
  text?: string;
  zone?: string;
};

async function POST_handler(
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

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text : "";
  const zoneRaw = (body.zone ?? "main").trim().toLowerCase();
  if (!ALLOWED_ZONES.has(zoneRaw as Zone)) {
    return NextResponse.json(
      { error: "zone must be main, sideboard, or commander" },
      { status: 400 }
    );
  }
  const zone = zoneRaw as Zone;

  const parsed = parseDeckListTextWithDisplayNames(text);
  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "No valid card lines found in pasted text" },
      { status: 400 }
    );
  }

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

  const { data: ownedRows, error: ownedErr } = await supabase
    .from("cards")
    .select("id, name")
    .eq("user_id", user.id);

  if (ownedErr) {
    return NextResponse.json({ error: ownedErr.message }, { status: 500 });
  }

  const owned = (ownedRows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
  }));

  type Added = { name: string; card_id: string; quantity: number };
  type Unmatched = { line: string; quantity: number; reason: string };

  const added: Added[] = [];
  const unmatched: Unmatched[] = [];

  const toInsert = new Map<string, { name: string; quantity: number }>();

  for (const line of parsed) {
    const match = matchCardName(
      line.displayName,
      line.nameLower,
      owned
    );
    if (!match) {
      unmatched.push({
        line: line.displayName,
        quantity: line.quantity,
        reason: "No exact or unique partial match in your collection",
      });
      continue;
    }
    const prev = toInsert.get(match.id);
    if (prev) {
      toInsert.set(match.id, {
        name: match.name,
        quantity: prev.quantity + line.quantity,
      });
    } else {
      toInsert.set(match.id, { name: match.name, quantity: line.quantity });
    }
  }

  if (toInsert.size === 0) {
    return NextResponse.json({
      added: [] as Added[],
      unmatched,
    });
  }

  const { error: delErr } = await supabase
    .from("deck_cards")
    .delete()
    .eq("deck_id", deckId)
    .eq("section", zone);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  const insertRows = [...toInsert.entries()].map(([card_id, v]) => ({
    deck_id: deckId,
    card_id,
    section: zone,
    quantity: v.quantity,
  }));

  const { error: insErr } = await supabase.from("deck_cards").insert(insertRows);

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  for (const [card_id, v] of toInsert) {
    added.push({ card_id, name: v.name, quantity: v.quantity });
  }
  added.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ added, unmatched });
}

export const POST = defineRoute("POST /api/decks/[deckId]/import", POST_handler);
