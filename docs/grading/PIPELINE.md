# Grading pipeline (model-ready)

MyCardArchive uses **`pipeline-v2`**: a versioned request envelope, a stable model input JSON contract, validation of remote output, per-dimension subscores, aggregate and per-dimension confidence, explanation tokens with optional heatmap hints and region flags, and a deterministic **`heuristic-v1`** fallback when no model is configured or inference fails.

## Flow

1. **Envelope** — `buildGradingRequestEnvelope` (`GradingRequestEnvelopeV1`) carries `cardId`, optional image URLs, and `requestedModel`.
2. **Model input** — `buildModelInputFromEnvelope` produces `mca.grading.model_input/v1` for HTTP POST to the worker.
3. **Remote inference** — If `MCA_GRADING_MODEL_URL` or `GRADING_MODEL_URL` is set, the API POSTs JSON and expects a response that includes a `GradingPayload`-compatible `grade` (or top-level fields). See `validateModelOutput` in `src/lib/grading/model-output-validator.ts`.
4. **Validation** — Parsed output must include valid `front` / `back` sides (required scalar fields). Optional fields: `explanationHints`, `regionFlags` per side. Optional top-level `summary` in the payload is merged over values recomputed from the two sides.
5. **Heuristic fallback** — `buildHeuristicGradingPayload` produces a full v2 summary (subgrades, `modelConfidence`, `dimensionConfidence`, `explanation` with tokens and overlay hints).

## v2 summary schema (`GradeSummary`)

| Field | Description |
|--------|-------------|
| `subgrades` | `centering`, `corners`, `edges`, `surface` (numeric; semantics unchanged from v1). |
| `modelConfidence` | Aggregate confidence in the grade (0–1). |
| `dimensionConfidence` | Optional per-dimension confidence: `centering`, `corners`, `edges`, `surface` (each 0–1 when present). |
| `explanation` | `tokens` (stable labels for UI/telemetry), optional `regionFlags` (named regions), optional `heatmapHints.front` / `heatmapHints.back` (same grid shape as side `surfaceHeatmapPreview` when provided). |

Sides may include `explanationHints` (string tags) and `regionFlags` for overlay alignment with the summary.

## Telemetry

- `grading.model.start` — Model HTTP request begins (endpoint configured).
- `grading.model.success` — Valid model output accepted.
- `grading.model.failure` — HTTP error, timeout, or validation failure (includes `reason`).
- `grading.pipeline.complete` — Final result with `source` and optional `fallbackReason`.
- `grading.model.subscores` — Emitted when subgrade values are present (includes `centering`, `corners`, `edges`, `surface` as applicable).
- `grading.model.confidence` — Emitted when `modelConfidence` is present; includes optional `dimensionConfidence`.
- `grading.model.explanation_used` — Once per completed grade; `explanationUsed` and `tokenCount` for v2 explanation payloads.

## Environment

| Variable | Purpose |
|----------|---------|
| `MCA_GRADING_MODEL_URL` | Primary URL for POST `GradingModelInputV1` JSON |
| `GRADING_MODEL_URL` | Alternate name if the primary is unset |

## Dev tools

In development, **`/dev/grading`** loads sample envelope, model input, and heuristic summary via `GET /api/dev/grading/inspect`.

## API response shape

`GET` and `POST` `/api/cards/[id]/grade` return:

```json
{
  "grade": { "cardId": "…", "front": {}, "back": {}, "summary": {} },
  "inference": { "source": "model" | "heuristic", "fallbackReason": "…" }
}
```

Clients that only read `grade` remain compatible; v2 fields are additive on `summary` and optional side fields.

## v3 — Region heatmaps & explanations

Pipeline **v3** extends `summary.explanation` (and compatible model output) with optional structured region data:

| Field | Description |
|-------|-------------|
| `regionsV3` | Array of `{ id, label, severity (0–1), bbox { x,y,w,h }, side, heatmapSlice? }` — normalized bbox coordinates relative to each side’s image. |
| Existing `heatmapHints` / side `surfaceHeatmapPreview` | Unchanged; v3 regions may reference the same grid convention for `heatmapSlice`. |

UI: `RegionV3Overlay` draws bbox highlights; `SurfaceHeatmap` remains the coarse wear map.

Telemetry additions:

- `grading.model.heatmap` — at least one heatmap layer present for the current grade result.
- `grading.model.region_explanation` — `regionsV3` non-empty.

---

## v4 — Temporal versioning, consistency, drift (Phase 63)

### Persisted runs (`card_grading_runs`)

Append-only rows per grade POST (RLS: owner’s cards only):

| Column | Purpose |
|--------|---------|
| `overall` | Aggregate numeric score snapshot. |
| `model_version` / `pipeline_version` | Pipeline / model metadata for badges and audits. |
| `inference_source` | e.g. `model` \| `heuristic`. |

`GET` `/api/cards/[id]/grade` compares the latest computed summary to the **previous** run for drift; `POST` persists a new row after computing drift vs prior run.

### Client summary (`GradeSummary`)

- `gradingConsistency` (see `src/lib/grading/consistency.ts`): `driftDetected`, `previousOverall`, `deltaOverall`, `driftThreshold`.
- UI: `GradeSummaryPanel` shows pipeline/model badges and a drift warning when `driftDetected` is true.

### Telemetry

| Event | When |
|-------|------|
| `grading.model.version_used` | Server: grade GET/POST includes pipeline/model identifiers. |
| `grading.model.drift_detected` | Server: drift vs previous persisted run exceeds threshold. |

See migration `046_grading_v4_history.sql`.

---

## v5 — Multi-model, cross-card consistency, grading fingerprint (Phase 68)

### Multiple model labels

Persisted runs (`card_grading_runs`) accept optional **`model_label`** (human-readable model id or version tag) and optional **`peer_card_id`** for the card used as a cross-reference in the same grading session.

### Cross-card consistency

When a **`peerCardId`** is supplied on `GET`/`POST` `/api/cards/[id]/grade`, the API can compare summaries between the primary card and the peer (centering, corners, edges, surface) and surface **consistency warnings** when spreads exceed a heuristic threshold.

### Grading fingerprint

Table **`grading_user_fingerprint`** stores a compact per-user aggregate (rolling stats) derived from recent grading runs so the UI can show stability of the user’s grading patterns over time.

### Client summary (`GradeSummary`)

- Optional **`gradingModelCompare`**: recent runs across model labels for quick comparison in the grade panel.
- Optional **`gradingCrossCard`**: deltas vs peer card when `peerCardId` is present.
- Optional **`gradingFingerprint`**: fingerprint row for the current user when available.

### Telemetry

| Event | When |
|-------|------|
| `grading.model.compare` | Server: model comparison payload attached to a grade response. |
| `grading.model.consistency` | Server: cross-card consistency check runs (includes whether warnings were emitted). |

See migration `050_grading_v5_fingerprint.sql`.

---

## v6 — Cross-user calibration, model fusion, stability (Phase 73)

### Fingerprint extensions

`grading_user_fingerprint` adds:

| Column | Purpose |
|--------|---------|
| `stability_score` | 0–1 stability derived from variance of recent `overall` values on the current card. |
| `calibration_offset` | Bias vs the **global cohort** average overall (`get_grading_cohort_avg_overall()`). |
| `fusion_meta` | JSON payload describing the last fused ensemble across distinct pipeline/model heads. |

### Cohort RPC

- **`get_grading_cohort_avg_overall()`** — `SECURITY DEFINER` aggregate over `card_grading_runs` for calibration (authenticated callers).

### Client summary (`GradeSummary`)

- **`gradingFusion`** — weighted blend across up to three distinct heads on the card (`pipeline_version` + `model_version` keys).
- **`gradingStability`** — score, variance, sample size.
- **`gradingCalibration`** — user vs cohort averages and offset.

### Telemetry

| Event | When |
|-------|------|
| `grading.model.fusion` | Server: fusion block present after v6 attach. |
| `grading.model.stability` | Server: stability block present. |

See migration `054_grading_v6_fusion.sql` and `src/lib/grading/v6-extras.ts`.

---

## v7 — Temporal drift model + recalibration (Phase 78)

### Drift model

RPC **`grading_compute_temporal_drift(p_user_id)`** fits a **linear trend** of `overall` vs `created_at` (epoch seconds) on the user’s last **48** `card_grading_runs` rows and returns:

| Field | Meaning |
|--------|---------|
| `slopePerDay` | Regression slope × seconds per day (human-scale). |
| `expectedShift7d` | Predicted change in overall over **7 days** along the fit. |
| `series` | Points `{ epoch, overall, at }` for charts. |

### Recalibration RPC

**`grading_recalibrate_for_drift(p_user_id)`** — reads the current drift snapshot, nudges **`grading_user_fingerprint.calibration_offset`** by a bounded fraction of `expectedShift7d`, and appends a row to **`grading_user_drift_history`** (per-user audit trail).

### API

| Method | Route | Purpose |
|--------|--------|---------|
| `GET` | `/api/grading/drift` | Current drift JSON + recent `grading_user_drift_history` rows. |
| `POST` | `/api/grading/drift/recalibrate` | Invokes recalibration RPC. |

### Client summary (`GradeSummary`)

- **`gradingTemporalDrift`** — model outputs + `series` for UI.
- **`gradingRecalibration`** — optional **suggestion** (non-destructive) when drift magnitude is high.

### Telemetry

| Event | When |
|-------|------|
| **`grading.model.drift_model`** | Drift computed on grade GET/POST or `GET /api/grading/drift`. |
| **`grading.model.recalibrate`** | `POST /api/grading/drift/recalibrate` succeeds. |

### Dev UI

`/dev/grading` includes a **drift chart** (sparkline) and **recalibration history** list.

Migration: `057_grading_v7_temporal_drift.sql` · `src/lib/grading/v7-drift.ts`.

---

## v8 — Cross-model consensus + confidence bands (Phase 83)

### Summary fields

| Field | Meaning |
|-------|---------|
| **`gradingConsensus`** | `score` (0–1), `band`, `headsCompared`, `crossHeadAgreement`, `subgradeTightness`, `perDimension` (centering/corners/edges/surface 0–1). |
| **`gradingConfidenceBand`** | `band`: `tight` \| `medium` \| `loose`, `label` for UI. |

Cross-head agreement uses variance of **`overall`** across distinct `pipeline_version` / `model_version` rows in **`card_grading_runs`**. Subgrade tightness uses spread of the current grade’s subgrades. Blended score drives the band thresholds.

### UI

- **`GradeSummaryPanel`** — consensus **meter** (bar), per-dimension %, **confidence band** chip.

### Telemetry

| Event | When |
|-------|------|
| **`grading.model.consensus`** | Server: `gradingConsensus` attached. |
| **`grading.model.confidence_band`** | Server: `gradingConfidenceBand` attached. |

`src/lib/grading/v8-consensus.ts`

