/**
 * Lightweight load tester (no external deps).
 *
 * Usage:
 *   npm run load-test
 *   LOAD_TEST_URL=https://staging.rkv-consulting.com npm run load-test
 *   LOAD_TEST_CONCURRENCY=100 LOAD_TEST_TOTAL=5000 npm run load-test
 *
 * For heavy production load testing, prefer k6 or artillery — this script is
 * a quick smoke + capacity probe that runs anywhere Node 20+ is available.
 */
import { performance } from 'node:perf_hooks';

const BASE_URL = process.env.LOAD_TEST_URL ?? 'https://rkv-consulting.com';
const CONCURRENT_REQUESTS = Number(process.env.LOAD_TEST_CONCURRENCY ?? 50);
const TOTAL_REQUESTS = Number(process.env.LOAD_TEST_TOTAL ?? 1000);
const REQUEST_TIMEOUT_MS = Number(process.env.LOAD_TEST_TIMEOUT_MS ?? 10_000);

interface Result {
  status: number;
  latency_ms: number;
  error?: string;
}

interface Summary {
  path: string;
  total: number;
  errors: number;
  error_rate: number;
  avg_latency_ms: number;
  p50: number;
  p95: number;
  p99: number;
  rps: number;
  duration_ms: number;
}

async function hitEndpoint(path: string): Promise<Result> {
  const start = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'rkv-load-test/1.0' },
    });
    // Drain the body so the connection can be reused.
    await res.arrayBuffer().catch(() => null);
    return { status: res.status, latency_ms: performance.now() - start };
  } catch (err) {
    return {
      status: 0,
      latency_ms: performance.now() - start,
      error: err instanceof Error ? err.message : 'unknown',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function pct(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

async function loadTest(path: string): Promise<Summary> {
  console.log(
    `\n→ Load testing ${path} (concurrency=${CONCURRENT_REQUESTS}, total=${TOTAL_REQUESTS})…`,
  );
  const results: Result[] = [];
  const startedAt = performance.now();
  let started = 0;

  const inFlight = new Set<Promise<void>>();

  while (started < TOTAL_REQUESTS) {
    while (inFlight.size < CONCURRENT_REQUESTS && started < TOTAL_REQUESTS) {
      started++;
      const p: Promise<void> = hitEndpoint(path).then((r) => {
        results.push(r);
        inFlight.delete(p);
      });
      inFlight.add(p);
    }
    await Promise.race(inFlight);
  }
  await Promise.all(inFlight);

  const duration_ms = performance.now() - startedAt;
  const latencies = results.map((r) => r.latency_ms).sort((a, b) => a - b);
  const errors = results.filter((r) => r.status === 0 || r.status >= 500).length;
  const avg = latencies.length
    ? latencies.reduce((s, l) => s + l, 0) / latencies.length
    : 0;

  const summary: Summary = {
    path,
    total: results.length,
    errors,
    error_rate: results.length ? errors / results.length : 0,
    avg_latency_ms: Math.round(avg),
    p50: Math.round(pct(latencies, 0.5)),
    p95: Math.round(pct(latencies, 0.95)),
    p99: Math.round(pct(latencies, 0.99)),
    rps: results.length / (duration_ms / 1000),
    duration_ms: Math.round(duration_ms),
  };

  console.log(`  Total: ${summary.total} · errors: ${summary.errors} (${(summary.error_rate * 100).toFixed(2)}%)`);
  console.log(`  RPS:   ${summary.rps.toFixed(1)} req/s · duration: ${summary.duration_ms}ms`);
  console.log(`  Latency avg: ${summary.avg_latency_ms}ms`);
  console.log(`  Latency p50: ${summary.p50}ms · p95: ${summary.p95}ms · p99: ${summary.p99}ms`);

  // Surface a couple of error reasons if any
  const sampleErrors = results.filter((r) => r.error).slice(0, 3);
  for (const e of sampleErrors) {
    console.log(`  · err: ${e.error}`);
  }

  return summary;
}

async function main() {
  console.log(`Load test target: ${BASE_URL}`);
  const endpoints = [
    '/',
    '/pricing',
    '/api/status/health',
  ];

  const results: Summary[] = [];
  for (const ep of endpoints) {
    const summary = await loadTest(ep);
    results.push(summary);
    // Cool-down between endpoints
    await new Promise((r) => setTimeout(r, 5000));
  }

  // Final report
  console.log('\n=== Summary ===');
  console.table(
    results.map((r) => ({
      path: r.path,
      total: r.total,
      errors: r.errors,
      'err %': (r.error_rate * 100).toFixed(2),
      'avg ms': r.avg_latency_ms,
      p50: r.p50,
      p95: r.p95,
      p99: r.p99,
      rps: r.rps.toFixed(1),
    })),
  );

  // Non-zero exit code if any endpoint had >1% error rate or p95 > 3s
  const failed = results.filter((r) => r.error_rate > 0.01 || r.p95 > 3000);
  if (failed.length) {
    console.error(`\n✗ ${failed.length} endpoint(s) exceeded thresholds (err>1% or p95>3s)`);
    process.exit(1);
  }
  console.log('\n✓ All endpoints within thresholds (err≤1%, p95≤3s)');
}

main().catch((err) => {
  console.error('Load test crashed:', err);
  process.exit(2);
});
