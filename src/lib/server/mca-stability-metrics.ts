import "server-only";

/** Populated when STABILITY_MODE=1 and the client POSTs to /api/internal/stability/metrics. */
export type VirtualizationRegressionPayload = {
  renderLoops: number;
  overscanHits: number;
  unexpectedRerenders: number;
  layoutThrashScore: number;
};

export type SyntheticInpPayload = {
  lastMs: number;
  samples: number;
};

type Store = {
  virtualization: VirtualizationRegressionPayload | null;
  syntheticInp: SyntheticInpPayload | null;
  updatedAt: number;
};

let store: Store = {
  virtualization: null,
  syntheticInp: null,
  updatedAt: 0,
};

export function isStabilityModeEnabled(): boolean {
  return process.env.STABILITY_MODE === "1";
}

export function ingestStabilityMetrics(partial: {
  virtualization?: Partial<VirtualizationRegressionPayload>;
  syntheticInp?: Partial<SyntheticInpPayload>;
}): void {
  if (!isStabilityModeEnabled()) return;
  const now = Date.now();
  const prev = store;
  let next: Store = { ...prev, updatedAt: now };
  const num = (x: unknown, fb: number): number => {
    const n = typeof x === "number" ? x : Number(x);
    return Number.isFinite(n) ? n : fb;
  };

  if (partial.virtualization) {
    const v = partial.virtualization;
    const pv = prev.virtualization;
    next.virtualization = {
      renderLoops: Math.max(0, Math.floor(num(v.renderLoops, pv?.renderLoops ?? 0))),
      overscanHits: Math.max(0, Math.floor(num(v.overscanHits, pv?.overscanHits ?? 0))),
      unexpectedRerenders: Math.max(0, Math.floor(num(v.unexpectedRerenders, pv?.unexpectedRerenders ?? 0))),
      layoutThrashScore: Math.max(0, num(v.layoutThrashScore, pv?.layoutThrashScore ?? 0)),
    };
  }
  if (partial.syntheticInp) {
    const s = partial.syntheticInp;
    const ps = prev.syntheticInp;
    next.syntheticInp = {
      lastMs: Math.max(0, num(s.lastMs, ps?.lastMs ?? 0)),
      samples: Math.max(0, Math.floor(num(s.samples, ps?.samples ?? 0))),
    };
  }
  store = next;
}

const STALE_MS = 120_000;

export function getVirtualizationRegressionSnapshot(): {
  ok: boolean;
  renderLoops: number;
  overscanHits: number;
  unexpectedRerenders: number;
  layoutThrashScore: number;
  stale: boolean;
  anomalyScore: number;
} {
  const v = store.virtualization;
  const stale = !v || Date.now() - store.updatedAt > STALE_MS;
  if (!v || stale) {
    return {
      ok: true,
      renderLoops: 0,
      overscanHits: 0,
      unexpectedRerenders: 0,
      layoutThrashScore: 0,
      stale: true,
      anomalyScore: 0,
    };
  }
  const anomalyScore = Math.min(
    1,
    v.unexpectedRerenders / 50 + v.layoutThrashScore / 20 + (v.overscanHits > 500 ? 0.2 : 0)
  );
  return {
    ok: anomalyScore < 0.85,
    renderLoops: v.renderLoops,
    overscanHits: v.overscanHits,
    unexpectedRerenders: v.unexpectedRerenders,
    layoutThrashScore: v.layoutThrashScore,
    stale: false,
    anomalyScore,
  };
}

export function getSyntheticInpSnapshot(): { lastMs: number; samples: number; stale: boolean } {
  const s = store.syntheticInp;
  const stale = !s || Date.now() - store.updatedAt > STALE_MS;
  if (!s) return { lastMs: 0, samples: 0, stale: true };
  return { lastMs: s.lastMs, samples: s.samples, stale };
}

export function clearStabilityMetricsForTests(): void {
  store = { virtualization: null, syntheticInp: null, updatedAt: 0 };
}

/** Recovery: drop virtualization aggregates so clients can repopulate cleanly. */
export function resetVirtualizationMetricsOnly(): void {
  store = { ...store, virtualization: null, updatedAt: Date.now() };
}

/** Recovery: reset synthetic INP aggregates (server-side mirror). */
export function resetSyntheticInpMetricsOnly(): void {
  store = { ...store, syntheticInp: null, updatedAt: Date.now() };
}
