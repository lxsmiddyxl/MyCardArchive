/**
 * Shared load-test utilities — latency histogram, throughput, error rate.
 */

export function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

export function buildHistogram(latenciesMs) {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const buckets = [50, 100, 200, 500, 1000, 2000, 5000];
  const counts = Object.fromEntries(buckets.map((b) => [`<=${b}ms`, 0]));
  counts[">5000ms"] = 0;
  for (const ms of sorted) {
    let placed = false;
    for (const b of buckets) {
      if (ms <= b) {
        counts[`<=${b}ms`] += 1;
        placed = true;
        break;
      }
    }
    if (!placed) counts[">5000ms"] += 1;
  }
  return {
    count: sorted.length,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    buckets: counts,
  };
}

export async function runConcurrent(url, opts) {
  const {
    concurrency = 5,
    requests = 20,
    method = "GET",
    headers = {},
    body,
    timeoutMs = 15_000,
  } = opts;
  const latencies = [];
  let errors = 0;
  let completed = 0;
  const started = Date.now();

  async function one() {
    const t0 = performance.now();
    try {
      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) errors += 1;
    } catch {
      errors += 1;
    } finally {
      latencies.push(performance.now() - t0);
      completed += 1;
    }
  }

  const queue = Array.from({ length: requests }, () => one);
  let i = 0;
  async function worker() {
    while (i < queue.length) {
      const fn = queue[i++];
      await fn();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  const durationSec = (Date.now() - started) / 1000;
  return {
    url,
    requests,
    concurrency,
    errors,
    errorRate: requests ? errors / requests : 0,
    throughputRps: durationSec > 0 ? completed / durationSec : 0,
    histogram: buildHistogram(latencies),
  };
}

export function evaluateThresholds(result, thresholds) {
  const fails = [];
  if (result.errorRate > thresholds.maxErrorRate) {
    fails.push(`errorRate ${result.errorRate} > ${thresholds.maxErrorRate}`);
  }
  if (result.histogram.p95 > thresholds.p95Ms) {
    fails.push(`p95 ${result.histogram.p95}ms > ${thresholds.p95Ms}ms`);
  }
  return { ok: fails.length === 0, fails };
}
