import { loadPublicDeck } from "@/lib/public-deck/load-public-deck";
import { defineRoute } from "@/lib/server/api-route";
import { NextResponse } from "next/server";

const CACHE_HEADER =
  "public, s-maxage=300, stale-while-revalidate=3600";

async function GET_handler(
  _request: Request,
  context: { params: Record<string, string> }
) {
  const deckId = context.params["deckId"]?.trim();
  if (!deckId) {
    return NextResponse.json({ error: "deckId is required" }, { status: 400 });
  }

  const result = await loadPublicDeck(deckId);

  if (!result.ok) {
    const privateHeaders = {
      "Cache-Control": "private, no-store",
    } as const;
    if (result.status === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: privateHeaders });
    }
    if (result.status === 500) {
      return NextResponse.json({ error: "Server error" }, { status: 500, headers: privateHeaders });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404, headers: privateHeaders });
  }

  return NextResponse.json(result.data, {
    headers: {
      "Cache-Control": CACHE_HEADER,
    },
  });
}

export const GET = defineRoute("GET /api/public/decks/[deckId]", GET_handler);
