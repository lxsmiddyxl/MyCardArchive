"use client";

import { Button } from "@/mca-ui/button";
import { Field } from "@/mca-ui/field";
import { Panel } from "@/mca-ui/panel";
import type { GradeSummary } from "@/lib/grading/types";
import { memo } from "react";

export type GradeSummaryPanelProps = {
  summary: GradeSummary | null;
  loading?: boolean;
  onRefresh?: () => void;
  refreshDisabled?: boolean;
};

export const GradeSummaryPanel = memo(function GradeSummaryPanel({
  summary,
  loading,
  onRefresh,
  refreshDisabled,
}: GradeSummaryPanelProps) {
  const empty =
    !summary?.label &&
    summary?.overall == null &&
    summary?.modelConfidence == null &&
    !summary?.explanation?.tokens?.length;

  const fmtConf = (n: number | null | undefined) =>
    n == null || Number.isNaN(n) ? "—" : `${Math.round(n * 100)}%`;

  const dim = summary?.dimensionConfidence;

  return (
    <Panel className="border-mca-border bg-mca-surface-elevated/40 p-mca-md transition-all duration-200 ease-mca-standard">
      <div className="flex flex-col gap-mca-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-mca-label font-semibold uppercase tracking-wide text-mca-ink-subtle">
            Grade summary
          </p>
          <p className="mt-mca-xs text-mca-caption text-mca-hint">
            Uses the grading pipeline — heuristic fallback until a remote model is configured (`MCA_GRADING_MODEL_URL`).
          </p>
        </div>
        {onRefresh ? (
          <Button
            type="button"
            variant="secondary"
            disabled={loading || refreshDisabled}
            className="shrink-0 text-mca-caption"
            onClick={onRefresh}
          >
            {loading ? "Running…" : "Run analysis"}
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="mt-mca-md text-mca-body text-mca-ink-subtle">Loading grading data…</p>
      ) : empty ? (
        <p className="mt-mca-md text-mca-body text-mca-ink-subtle">
          No grade yet. Run analysis to generate a heuristic preview.
        </p>
      ) : (
        <div className="mt-mca-md grid gap-mca-md sm:grid-cols-2">
          <Field id="grade-overall" label="Overall">
            <p id="grade-overall" className="text-mca-h3 text-mca-ink-strong">
              {summary?.overall != null ? summary.overall.toFixed(1) : "—"}
            </p>
          </Field>
          <Field id="grade-label" label="Label">
            <p id="grade-label" className="text-mca-body text-mca-ink-body">
              {summary?.label ?? "—"}
            </p>
          </Field>
          <Field id="grade-confidence" label="Model confidence">
            <p className="text-mca-body text-mca-ink-muted">{fmtConf(summary?.modelConfidence)}</p>
          </Field>
          <Field id="grade-confidence-dims" label="Confidence by dimension">
            <div className="grid grid-cols-2 gap-mca-xs text-mca-caption text-mca-ink-muted">
              <span>C: {fmtConf(dim?.centering)}</span>
              <span>Cr: {fmtConf(dim?.corners)}</span>
              <span>E: {fmtConf(dim?.edges)}</span>
              <span>S: {fmtConf(dim?.surface)}</span>
            </div>
          </Field>
          <Field id="sub-centering" label="Centering">
            <p className="text-mca-body text-mca-ink-muted">{summary?.subgrades.centering ?? "—"}</p>
          </Field>
          <Field id="sub-corners" label="Corners">
            <p className="text-mca-body text-mca-ink-muted">{summary?.subgrades.corners ?? "—"}</p>
          </Field>
          <Field id="sub-edges" label="Edges">
            <p className="text-mca-body text-mca-ink-muted">{summary?.subgrades.edges ?? "—"}</p>
          </Field>
          <Field id="sub-surface" label="Surface">
            <p className="text-mca-body text-mca-ink-muted">{summary?.subgrades.surface ?? "—"}</p>
          </Field>
          {summary?.explanation?.tokens?.length ? (
            <Field id="grade-explanation" label="Explanation" className="sm:col-span-2">
              <div id="grade-explanation" className="flex flex-wrap gap-mca-xs">
                {summary.explanation.tokens.map((t) => (
                  <span
                    key={t}
                    className="rounded-mca-control border border-mca-border-subtle bg-mca-surface-elevated/50 px-mca-xs py-mca-micro text-mca-caption text-mca-ink-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Field>
          ) : null}
          {summary?.pipelineVersion || summary?.modelVersion ? (
            <Field id="grade-versions" label="Pipeline / model (v4)" className="sm:col-span-2">
              <div className="flex flex-wrap gap-mca-sm text-mca-caption text-mca-ink-body">
                {summary.pipelineVersion ? (
                  <span className="rounded-mca-control border border-mca-accent-strong/35 bg-mca-accent-strong/10 px-mca-sm py-mca-xs font-mono">
                    {summary.pipelineVersion}
                  </span>
                ) : null}
                {summary.modelVersion ? (
                  <span className="rounded-mca-control border border-mca-border px-mca-sm py-mca-xs font-mono">
                    {summary.modelVersion}
                  </span>
                ) : null}
              </div>
            </Field>
          ) : null}
          {summary?.gradingConsistency?.driftDetected ? (
            <Field id="grade-drift" label="Grading drift" className="sm:col-span-2">
              <p className="text-mca-body text-mca-warning-tint">
                Large change vs your last saved run (Δ
                {summary.gradingConsistency.driftDelta != null
                  ? summary.gradingConsistency.driftDelta.toFixed(1)
                  : "—"}{" "}
                pts). Re-check photos and lighting.
              </p>
            </Field>
          ) : null}
          {summary?.gradingModelCompare && summary.gradingModelCompare.runs.length >= 2 ? (
            <Field id="grade-model-compare" label="Model comparison (v5)" className="sm:col-span-2">
              <p className="text-mca-caption text-mca-ink-muted">
                Δ {summary.gradingModelCompare.delta.toFixed(2)} overall between last two distinct model
                versions on this card.
              </p>
              <ul className="mt-mca-sm space-y-mca-xs text-mca-caption text-mca-ink-body">
                {summary.gradingModelCompare.runs.slice(0, 3).map((r, i) => (
                  <li key={`${r.createdAt}-${i}`} className="font-mono">
                    {r.modelVersion ?? "—"} · overall {r.overall?.toFixed(1) ?? "—"}
                  </li>
                ))}
              </ul>
            </Field>
          ) : null}
          {summary?.gradingCrossCard?.consistencyWarning ? (
            <Field id="grade-cross" label="Cross-card consistency" className="sm:col-span-2">
              <p className="text-mca-body text-mca-warning-tint">
                Large gap vs peer card overall (Δ
                {summary.gradingCrossCard.deltaOverall != null
                  ? summary.gradingCrossCard.deltaOverall.toFixed(1)
                  : "—"}{" "}
                pts). Compare lighting and centering.
              </p>
            </Field>
          ) : null}
          {summary?.gradingFusion ? (
            <Field id="grade-fusion" label="Model fusion (v6)" className="sm:col-span-2">
              <p className="text-mca-body text-mca-ink-body">
                Fused overall ≈ {summary.gradingFusion.fusedOverall.toFixed(2)} across{" "}
                {summary.gradingFusion.heads} head(s).
              </p>
              {summary.gradingFusion.sources.length > 0 ? (
                <div className="mt-mca-sm flex flex-wrap gap-mca-xs">
                  {summary.gradingFusion.sources.map((s) => (
                    <span
                      key={s}
                      className="rounded-mca-control border border-mca-accent-strong/40 bg-mca-accent-strong/15 px-mca-sm py-mca-xs font-mono text-mca-caption text-mca-ink-body"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </Field>
          ) : null}
          {summary?.gradingStability ? (
            <Field id="grade-stability" label="Stability score (v6)" className="sm:col-span-2">
              <p className="text-mca-body text-mca-ink-body">
                {(summary.gradingStability.score * 100).toFixed(0)}% stable across recent runs (n=
                {summary.gradingStability.sampleSize}).
              </p>
            </Field>
          ) : null}
          {summary?.gradingConsensus ? (
            <Field id="grade-consensus" label="Cross-model consensus (v8)" className="sm:col-span-2">
              <div className="flex flex-wrap items-center gap-mca-md">
                <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-mca-border/60">
                  <div
                    className="h-full rounded-full bg-mca-accent-strong transition-all duration-200 ease-mca-standard"
                    style={{ width: `${Math.round(summary.gradingConsensus.score * 100)}%` }}
                  />
                </div>
                <span className="text-mca-body font-medium text-mca-ink-strong tabular-nums">
                  {(summary.gradingConsensus.score * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-mca-sm text-mca-caption text-mca-ink-muted">
                Heads compared: {summary.gradingConsensus.headsCompared} · cross-head agreement{" "}
                {(summary.gradingConsensus.crossHeadAgreement * 100).toFixed(0)}% · subgrade tightness{" "}
                {(summary.gradingConsensus.subgradeTightness * 100).toFixed(0)}%
              </p>
              <div className="mt-mca-sm grid grid-cols-2 gap-mca-xs text-mca-caption text-mca-ink-muted sm:grid-cols-4">
                <span>C: {(summary.gradingConsensus.perDimension.centering * 100).toFixed(0)}%</span>
                <span>Cr: {(summary.gradingConsensus.perDimension.corners * 100).toFixed(0)}%</span>
                <span>E: {(summary.gradingConsensus.perDimension.edges * 100).toFixed(0)}%</span>
                <span>S: {(summary.gradingConsensus.perDimension.surface * 100).toFixed(0)}%</span>
              </div>
            </Field>
          ) : null}
          {summary?.gradingConfidenceBand ? (
            <Field id="grade-confidence-band" label="Confidence band (v8)" className="sm:col-span-2">
              <span
                className={`inline-flex rounded-full px-mca-sm py-mca-trace text-mca-caption font-semibold ${
                  summary.gradingConfidenceBand.band === "tight"
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                    : summary.gradingConfidenceBand.band === "medium"
                      ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
                      : "bg-rose-500/10 text-rose-900 dark:text-rose-200"
                }`}
              >
                {summary.gradingConfidenceBand.label}
              </span>
            </Field>
          ) : null}
          {summary?.gradingCalibration?.cohortAvg != null ? (
            <Field id="grade-calibration" label="Cross-user calibration (v6)" className="sm:col-span-2">
              <p className="text-mca-body text-mca-ink-muted">
                Cohort avg {summary.gradingCalibration.cohortAvg?.toFixed(2)} · your avg{" "}
                {summary.gradingCalibration.userAvg?.toFixed(2) ?? "—"} · offset{" "}
                {summary.gradingCalibration.offset.toFixed(2)} pts.
              </p>
            </Field>
          ) : null}
          {summary?.gradingFingerprint ? (
            <Field id="grade-fingerprint" label="Grading fingerprint" className="sm:col-span-2">
              <p className="font-mono text-mca-caption text-mca-ink-body">{summary.gradingFingerprint.hash}</p>
              <p className="mt-mca-xs text-mca-caption text-mca-ink-muted">
                Models seen: {summary.gradingFingerprint.modelVersions.join(", ") || "—"}
              </p>
            </Field>
          ) : null}
          <Field id="grade-meta" label="Meta" className="sm:col-span-2">
            <p className="text-mca-caption text-mca-ink-subtle">
              {summary?.modelVersion ?? "—"} ·{" "}
              {summary?.analyzedAt
                ? new Date(summary.analyzedAt).toLocaleString()
                : "—"}
            </p>
          </Field>
        </div>
      )}
    </Panel>
  );
});
