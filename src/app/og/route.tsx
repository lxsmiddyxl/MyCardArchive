import { OG_SIZE, mcaOgFallbackImageResponse } from "@/lib/og/mca-og-image";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

function dataPng(buf: Buffer): string {
  return `data:image/png;base64,${buf.toString("base64")}`;
}

function dataSvg(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Dynamic OG image: layered marketing templates + logo + title/subtitle.
 * Query: `title`, `subtitle`, `theme` = light | dark
 *
 * Example: `/og?title=MyCardArchive&subtitle=Your+collection&theme=dark`
 */
export async function GET(request: Request): Promise<ImageResponse> {
  const { searchParams } = new URL(request.url);
  const title =
    searchParams.get("title")?.trim() ||
    process.env.OG_DEFAULT_TITLE?.trim() ||
    "MyCardArchive";
  const subtitle =
    searchParams.get("subtitle")?.trim() ||
    process.env.OG_DEFAULT_SUBTITLE?.trim() ||
    "Your collection, organized in binders.";
  const theme = searchParams.get("theme") === "light" ? "light" : "dark";

  const safeTitle = title.slice(0, 80);
  const safeSub = subtitle.slice(0, 160);

  const ogDir = path.join(process.cwd(), "public", "artwork", "marketing", "og");
  try {
    const [baseBuf, accentBuf, logoSvg] = await Promise.all([
      readFile(path.join(ogDir, "og-template-base.png")),
      readFile(
        path.join(ogDir, theme === "dark" ? "og-template-dark.png" : "og-template-light.png")
      ),
      readFile(path.join(ogDir, "og-logo.svg"), "utf8"),
    ]);

    const fg = theme === "dark" ? "#fafafa" : "#18181b";
    const sub = theme === "dark" ? "#a1a1aa" : "#52525b";

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            position: "relative",
            fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", sans-serif',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse / OG */}
          <img
            src={dataPng(baseBuf)}
            alt=""
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{ position: "absolute", inset: 0, objectFit: "cover" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse / OG */}
          <img
            src={dataPng(accentBuf)}
            alt=""
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{
              position: "absolute",
              inset: 0,
              objectFit: "cover",
              opacity: 0.88,
            }}
          />
          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 44,
              padding: "64px 72px",
              width: "100%",
              height: "100%",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse / OG */}
            <img src={dataSvg(logoSvg)} alt="" width={108} height={108} style={{ flexShrink: 0 }} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 18,
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 50,
                  fontWeight: 700,
                  color: fg,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                }}
              >
                {safeTitle}
              </div>
              <div style={{ fontSize: 26, fontWeight: 500, color: sub, lineHeight: 1.35 }}>
                {safeSub}
              </div>
            </div>
          </div>
        </div>
      ),
      { ...OG_SIZE }
    );
  } catch {
    return mcaOgFallbackImageResponse();
  }
}
