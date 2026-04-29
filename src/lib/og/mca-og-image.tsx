import { ImageResponse } from "next/og";
import { ogPublicFileUrl } from "@/lib/og/og-asset-base-url";

export const OG_SIZE = {
  width: 1200,
  height: 630,
} as const;

type Theme = "dark" | "light";

const themeTokens: Record<
  Theme,
  {
    bg: string;
    fg: string;
    sub: string;
    label: string;
    barBg: string;
    barStroke: string;
    chrome1: string;
    chrome2: string;
    chrome3: string;
    accentBar: string;
  }
> = {
  dark: {
    bg: "linear-gradient(135deg, #09090b 0%, #18181b 55%, #0f172a 100%)",
    fg: "#fafafa",
    sub: "#a1a1aa",
    label: "#34d399",
    barBg: "#18181b",
    barStroke: "#3f3f46",
    chrome1: "rgba(39, 39, 42, 0.95)",
    chrome2: "rgba(63, 63, 70, 0.85)",
    chrome3: "rgba(63, 63, 70, 0.55)",
    accentBar: "rgba(16, 185, 129, 0.65)",
  },
  light: {
    bg: "linear-gradient(135deg, #fafafa 0%, #f4f4f5 50%, #e4e4e7 100%)",
    fg: "#18181b",
    sub: "#52525b",
    label: "#059669",
    barBg: "#ffffff",
    barStroke: "#d4d4d8",
    chrome1: "rgba(255, 255, 255, 0.98)",
    chrome2: "rgba(228, 228, 231, 0.95)",
    chrome3: "rgba(228, 228, 231, 0.75)",
    accentBar: "rgba(52, 211, 153, 0.85)",
  },
};

export type McaOgImageArgs = {
  /** Primary headline (deck name, card name, etc.) */
  title: string;
  /** Subtitle — format, set code, or secondary context */
  subtitle?: string;
  /** Optional third line (e.g. card count, rarity) */
  meta?: string;
  theme?: Theme;
  /**
   * Optional remote image (HTTPS) shown on the right when fetch succeeds in OG pipeline.
   * When omitted, `motifSrc` is used.
   */
  heroImageUrl?: string | null;
  /**
   * Path under `/public` for branded silhouette (SVG/PNG), e.g. `/artwork/marketing/...`.
   */
  motifSrc: string;
  /** Rarely: second small emblem (e.g. tier) path under `/public` */
  emblemSrc?: string | null;
};

export function mcaOgImageResponse(args: McaOgImageArgs): ImageResponse {
  const theme = args.theme ?? "dark";
  const t = themeTokens[theme];
  const motifAbsolute = ogPublicFileUrl(args.motifSrc);
  const emblemAbsolute = args.emblemSrc
    ? ogPublicFileUrl(args.emblemSrc)
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          justifyContent: "space-between",
          background: t.bg,
          color: t.fg,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          position: "relative",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "64px 56px 120px",
            maxWidth: 760,
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: t.label,
            }}
          >
            MyCardArchive
          </div>
          <div
            style={{
              fontSize: 54,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              color: t.fg,
            }}
          >
            {args.title}
          </div>
          {args.subtitle ? (
            <div
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: t.sub,
                lineHeight: 1.35,
              }}
            >
              {args.subtitle}
            </div>
          ) : null}
          {args.meta ? (
            <div
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: t.sub,
                opacity: 0.92,
              }}
            >
              {args.meta}
            </div>
          ) : null}
          {emblemAbsolute ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse / OG */}
              <img src={emblemAbsolute} alt="" width={72} height={72} />
            </div>
          ) : null}
        </div>

        <div
          style={{
            width: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 56px 120px 0",
          }}
        >
          {args.heroImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- ImageResponse / OG */
            <img
              src={args.heroImageUrl}
              alt=""
              width={312}
              height={436}
              style={{
                borderRadius: 28,
                objectFit: "cover",
                border: `3px solid ${theme === "dark" ? "#3f3f46" : "#d4d4d8"}`,
                boxShadow: "0 22px 48px rgba(0,0,0,0.22)",
              }}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element -- ImageResponse / OG */
            <img
              src={motifAbsolute}
              alt=""
              width={340}
              height={220}
              style={{
                objectFit: "contain",
                opacity: theme === "light" ? 0.95 : 0.92,
              }}
            />
          )}
        </div>

        {/* Chrome brand strip — matches Phase 25 OG template bars (no baked typography). */}
        <div
          style={{
            position: "absolute",
            left: 72,
            bottom: 48,
            width: 300,
            height: 48,
            borderRadius: 16,
            background: t.barBg,
            border: `1.5px solid ${t.barStroke}`,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            padding: "0 18px",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 38,
              height: 22,
              borderRadius: 8,
              background: t.accentBar,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                width: 124,
                height: 10,
                borderRadius: 5,
                background: t.chrome1,
              }}
            />
            <div
              style={{
                width: 88,
                height: 8,
                borderRadius: 4,
                background: t.chrome2,
              }}
            />
            <div
              style={{
                width: 56,
                height: 8,
                borderRadius: 4,
                background: t.chrome3,
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}

export function mcaOgFallbackImageResponse(message = "MyCardArchive"): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
          color: "#fafafa",
          fontSize: 44,
          fontWeight: 600,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        {message}
      </div>
    ),
    { ...OG_SIZE }
  );
}
