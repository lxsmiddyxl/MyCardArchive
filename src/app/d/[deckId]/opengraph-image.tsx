import { loadPublicDeck } from "@/lib/public-deck/load-public-deck";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";

export const alt = "Deck preview";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

type Props = {
  params: { deckId: string };
};

function fallbackOgImage(message = "MyCardArchive") {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          color: "#fafafa",
          fontSize: 42,
          fontWeight: 600,
        }}
      >
        {message}
      </div>
    ),
    { ...size }
  );
}

export default async function Image({ params }: Props) {
  let deckId = "";
  try {
    deckId = typeof params?.deckId === "string" ? params.deckId.trim() : "";
  } catch {
    return fallbackOgImage();
  }

  if (!deckId) {
    return fallbackOgImage();
  }

  let result: Awaited<ReturnType<typeof loadPublicDeck>>;
  try {
    result = await loadPublicDeck(deckId);
  } catch {
    return fallbackOgImage();
  }

  if (!result.ok) {
    return fallbackOgImage();
  }

  try {
  const { deck, owner_display_name, deck_stats, hero } = result.data;
  const colors = Array.isArray(deck_stats.color_identity)
    ? deck_stats.color_identity.slice(0, 8)
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          background: "linear-gradient(135deg, #fafafa 0%, #e4e4e7 100%)",
          color: "#18181b",
          padding: 48,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 20,
            paddingRight: 32,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#71717a",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            MyCardArchive
          </div>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.15 }}>
            {deck.name}
          </div>
          <div style={{ fontSize: 28, color: "#52525b", display: "flex", gap: 12 }}>
            <span style={{ textTransform: "capitalize" }}>{deck.format}</span>
            <span style={{ color: "#a1a1aa" }}>·</span>
            <span>{owner_display_name}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
            {colors.map((c) => (
              <span
                key={c}
                style={{
                  background: "#27272a",
                  color: "#fafafa",
                  padding: "8px 14px",
                  borderRadius: 10,
                  fontSize: 20,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
        {hero?.image_url ? (
          <div
            style={{
              width: 340,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse */}
            <img
              src={hero.image_url}
              alt=""
              width={312}
              height={436}
              style={{
                borderRadius: 16,
                objectFit: "cover",
                border: "4px solid #27272a",
                boxShadow: "0 24px 48px rgba(0,0,0,0.18)",
              }}
            />
          </div>
        ) : null}
      </div>
    ),
    { ...size }
  );
  } catch {
    return fallbackOgImage();
  }
}
