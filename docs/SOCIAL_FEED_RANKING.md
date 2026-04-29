# Social feed ranking v2 (ML-assisted relevance)

Phase **72** extends the global feed with richer ranking signals and a **deterministic ML placeholder** (`ml_assist`) blended into the final score.

## RPC: `get_global_feed_v2` (migration `053_feed_ranking_v2.sql`)

Replaces the client-facing call for **`GET /api/feed`** (v1 `get_global_feed` remains available for compatibility).

### Signals (per row)

Each returned item includes `rank_score` and `signals`:

| Signal | Meaning |
|--------|---------|
| `recency_epoch` | `extract(epoch from created_at)` — newer events rank higher. |
| `mutual` | Large boost when the actor is a **mutual trainer** (`social_mutual_pairs`). |
| `engagement` | For `kind = post`, scaled like count on `community_post_likes` (capped). |
| `shared_sets` | Overlap of **catalog set ids** between viewer and actor (capped). |
| `marketplace_overlap` | Count of shared **catalog_card_id** rows where both sides have marketplace flags. |
| `ml_assist` | Deterministic hash-based micro-boost (placeholder for a future model). |

## API & telemetry

- **`GET /api/feed`** — calls `get_global_feed_v2` and emits:
  - `feed.rank.compute` (includes `ranking: "v2"`)
  - `feed.view`
  - `feed.rank.ml` — aggregate `mlAssistAvg` over the first page
  - `feed.rank.signal` — mutual hit count + engagement score sum (aggregate)

## UI

`GlobalFeedClient` shows a compact signal line when `signals` is present on an item.

---

## v3 — Hybrid ML + heuristics + personalization (Phase 77)

### Pipeline

1. **`get_global_feed_v2`** (unchanged) returns candidate rows with SQL-computed `rank_score` and `signals` (recency, mutual, engagement, shared sets, marketplace overlap, `ml_assist` placeholder).
2. **`GET /api/feed`** re-orders those rows in the app using `rankFeedItemsHybrid()` (`src/lib/feed/hybrid-rank.ts`):
   - **ML relevance** — deterministic score per `(viewer_id, feed_event_id, actor_id)` plus a blend of SQL `ml_assist` (stand-in for a future model).
   - **Heuristic** — normalized combination of the SQL signal vector (excluding reliance on monolithic `rank_score` alone).
   - **Personalization** — mutual boost, catalog/market overlap, and a stable per-(viewer, actor) affinity term.

### Heuristic fallback

Append **`ml=0`** to the feed query string to disable the ML branch; ranking uses heuristics + personalization only (`used_ml: false` in debug payloads).

### API & telemetry

- **`GET /api/feed`** — same as v2 RPC, then hybrid reorder. Emits:
  - `feed.rank.compute` — `ranking: "v3_hybrid"`
  - **`feed.rank.hybrid`** — `avgHybrid`, `useMl`, `itemCount`
  - **`feed.rank.personalized`** — `boostedCount` (rows with stronger personalization mass), `itemCount`
  - `feed.view`, `feed.rank.ml`, `feed.rank.signal` (unchanged aggregates)

### Debug / inspector

- **`GET /api/feed?debug=1`** — attaches `ranking` on each item (hybrid / ML / heuristic / personalized / `used_ml`).
- **Dev UI** — `/dev/feed` table inspector (development only).

### UI

| Piece | Location |
|-------|----------|
| Feed (hybrid order, no score payload) | `/feed` → `GlobalFeedClient` |
| Ranking inspector | `/dev/feed` → `FeedInspectorClient` |

---

## v4 — Engagement prediction (Phase 82)

### Signals

After SQL + hybrid (v3), each item is rescored with:

| Signal | Meaning |
|--------|---------|
| **Predicted engagement** | Lightweight blend of SQL `engagement` (likes, etc.) and a deterministic hash (stand-in for a full model). |
| **User affinity** | Mutual overlap, shared sets / marketplace overlap, and stable viewer↔actor affinity. |
| **Freshness decay** | \(\exp(-\text{ageHours} / 72)\) so older items fade smoothly. |

Combined score (default weights): `0.42·hybrid + 0.26·predicted_engagement + 0.16·affinity + 0.16·freshness`.

### API & telemetry

- **`GET /api/feed`** — uses `rankFeedItemsV4()` (`src/lib/feed/engagement-v4.ts`). Emits:
  - `feed.rank.compute` — `ranking: "v4_engagement"`
  - **`feed.rank.prediction`** — `avgPredicted`
  - **`feed.rank.affinity`** — `avgAffinity`
  - Existing: `feed.rank.hybrid` (includes `layer: "v4"`), `feed.rank.personalized`, `feed.view`, etc.

### Why am I seeing this?

- With **`?debug=1`**, each item may include `ranking.version === "v4"` and `ranking.v4.why` (human-readable factor summary).
- **Dev UI** — `/dev/feed` shows numeric columns plus a **Why am I seeing this?** list.

Implementation: `src/lib/feed/engagement-v4.ts`.
