"use client";

import { CenteringOverlay } from "@/components/grading/centering-overlay";
import { CornerMarkers } from "@/components/grading/corner-markers";
import { EdgeWearIndicators } from "@/components/grading/edge-wear-indicators";
import { ExplanationRegionOverlay } from "@/components/grading/explanation-region-overlay";
import { GradeSummaryPanel } from "@/components/grading/grade-summary-panel";
import { RegionV3Overlay } from "@/components/grading/region-v3-overlay";
import { SurfaceHeatmap } from "@/components/grading/surface-heatmap";
import { FtueOverlay } from "@/components/onboarding/ftue-overlay";
import { mcaLog } from "@/lib/logging/mca-log-client";
import { Panel } from "@/mca-ui/panel";
import type { GradingPayload } from "@/lib/grading/types";
import Image from "next/image";
import { memo, useEffect, useMemo, useRef } from "react";

const IMG_BLUR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

type Props = {
  cardName: string;
  frontHeroSrc: string | null;
  backDisplaySrc: string | null;
  backImageFailed: boolean;
  onBackImageError: () => void;
  grading: GradingPayload | null;
  gradingLoading: boolean;
  onRunAnalysis?: () => void;
  readOnly?: boolean;
};

export const CardGradingSection = memo(function CardGradingSection({
  cardName,
  frontHeroSrc,
  backDisplaySrc,
  backImageFailed,
  onBackImageError,
  grading,
  gradingLoading,
  onRunAnalysis,
  readOnly = false,
}: Props) {
  const front = grading?.front;
  const back = grading?.back;
  const summary = grading?.summary;
  const frontHeatmap =
    summary?.explanation?.heatmapHints?.front ?? front?.surfaceHeatmapPreview ?? null;
  const backHeatmap = summary?.explanation?.heatmapHints?.back ?? back?.surfaceHeatmapPreview ?? null;
  const frontHeatVariant = summary?.explanation?.heatmapHints?.front ? "explanation_hint" : "surface";
  const backHeatVariant = summary?.explanation?.heatmapHints?.back ? "explanation_hint" : "surface";
  const regionsV3 = summary?.explanation?.regionsV3;

  const telemetryCtx = useMemo(
    () => ({ componentName: "CardGradingSection", surfaceName: "grading" } as const),
    []
  );
  const heatmapLoggedKey = useRef<string | null>(null);
  const regionLoggedKey = useRef<string | null>(null);

  useEffect(() => {
    heatmapLoggedKey.current = null;
    regionLoggedKey.current = null;
  }, [grading?.cardId]);

  useEffect(() => {
    if (!grading) return;
    if (!frontHeatmap && !backHeatmap) return;
    const key = `${grading.cardId}:heatmap`;
    if (heatmapLoggedKey.current === key) return;
    heatmapLoggedKey.current = key;
    mcaLog.event(
      "grading.model.heatmap",
      {
        cardId: grading.cardId,
        hasFront: Boolean(frontHeatmap),
        hasBack: Boolean(backHeatmap),
      },
      telemetryCtx
    );
  }, [grading, frontHeatmap, backHeatmap, telemetryCtx]);

  useEffect(() => {
    if (!grading || !regionsV3?.length) return;
    const key = `${grading.cardId}:regions:${regionsV3.length}`;
    if (regionLoggedKey.current === key) return;
    regionLoggedKey.current = key;
    mcaLog.event(
      "grading.model.region_explanation",
      { cardId: grading.cardId, regionCount: regionsV3.length },
      telemetryCtx
    );
  }, [grading, regionsV3, telemetryCtx]);

  return (
    <>
    <Panel
      elevated
      className="space-y-mca-md border-mca-border bg-mca-surface/40 p-mca-md transition-all duration-200 ease-mca-standard"
    >
      <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">Grading</p>
      <p className="text-mca-caption text-mca-hint">
        Overlays reflect the active pipeline (heuristic fallback or remote model when configured). Replace visuals when
        available.
      </p>

      <div className="grid gap-mca-md lg:grid-cols-2">
        <div>
          <p className="mb-mca-sm text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Front
          </p>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-mca-card border border-mca-border bg-mca-surface shadow-mca-panel dark:border-mca-border-subtle">
            {frontHeroSrc ? (
              <>
                <Image
                  src={frontHeroSrc}
                  alt={cardName}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 400px"
                  placeholder="blur"
                  blurDataURL={IMG_BLUR}
                  unoptimized={!frontHeroSrc.includes("supabase.co")}
                />
                <CenteringOverlay score={front?.centeringScore} confidence={front?.confidence} />
                <CornerMarkers scores={front?.cornerScores} />
                <SurfaceHeatmap intensityMap={frontHeatmap} variant={frontHeatVariant} />
                <RegionV3Overlay regions={regionsV3} side="front" />
                <ExplanationRegionOverlay regionFlags={front?.regionFlags} />
                <EdgeWearIndicators edges={front?.edgeWear} />
              </>
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center px-mca-sm text-center text-mca-body text-mca-hint">
                No front image yet.
              </div>
            )}
          </div>
        </div>

        {backDisplaySrc && !backImageFailed ? (
          <div>
            <p className="mb-mca-sm text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
              Back
            </p>
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-mca-card border border-mca-border bg-mca-surface shadow-mca-panel dark:border-mca-border-subtle">
              <Image
                src={backDisplaySrc}
                alt={`${cardName} (back)`}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 400px"
                placeholder="blur"
                blurDataURL={IMG_BLUR}
                unoptimized={!backDisplaySrc.includes("supabase.co")}
                onError={onBackImageError}
              />
              <CenteringOverlay score={back?.centeringScore} confidence={back?.confidence} />
              <CornerMarkers scores={back?.cornerScores} />
              <SurfaceHeatmap intensityMap={backHeatmap} variant={backHeatVariant} />
              <RegionV3Overlay regions={regionsV3} side="back" />
              <ExplanationRegionOverlay regionFlags={back?.regionFlags} />
              <EdgeWearIndicators edges={back?.edgeWear} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-center rounded-mca-card border border-dashed border-mca-border/90 bg-mca-surface-elevated/25 p-mca-md text-mca-body text-mca-hint lg:min-h-[200px]">
            No back image — overlays will apply when a back photo exists.
          </div>
        )}
      </div>

      <GradeSummaryPanel
        summary={grading?.summary ?? null}
        loading={gradingLoading}
        onRefresh={readOnly ? undefined : onRunAnalysis}
        refreshDisabled={gradingLoading}
      />
    </Panel>
    {!readOnly ? (
      <FtueOverlay storageKey="mca:ftue:grading" surfaceName="grading" title="About grading">
        <p>
          Scores are assistive heuristics—not a substitute for professional grading. Use them to compare copies and track
          changes over time.
        </p>
      </FtueOverlay>
    ) : null}
    </>
  );
});
