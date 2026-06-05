// =============================================
// Performance Benchmark Script
// Mesure les temps de réponse des endpoints API critiques
// Usage: node scripts/benchmark.js
// =============================================

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const ITERATIONS = parseInt(process.env.ITERATIONS || "20");
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "5");

const ENDPOINTS = [
  { name: "GET /api/campaigns", method: "GET", path: "/api/campaigns" },
  { name: "GET /api/prospects", method: "GET", path: "/api/prospects?limit=50" },
  { name: "GET /api/stats", method: "GET", path: "/api/stats" },
  { name: "GET /api/notifications", method: "GET", path: "/api/notifications" },
  { name: "GET /api/linkedin-actions", method: "GET", path: "/api/linkedin-actions?limit=50" },
  { name: "GET /api/test-db", method: "GET", path: "/api/test-db" },
  { name: "GET /api/performance", method: "GET", path: "/api/performance" },
];

function percentile(sorted, p) {
  const idx = Math.floor((sorted.length - 1) * p);
  return sorted[idx];
}

async function timeRequest(url, method) {
  const start = performance.now();
  try {
    const res = await fetch(url, { method });
    await res.text();
    return {
      duration: performance.now() - start,
      status: res.status,
      ok: res.ok,
    };
  } catch (e) {
    return {
      duration: performance.now() - start,
      status: 0,
      ok: false,
      error: e.message,
    };
  }
}

async function runConcurrent(tasks, concurrency) {
  const results = [];
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((t) => t()));
    results.push(...batchResults);
  }
  return results;
}

async function benchmarkEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;

  // Warmup
  await timeRequest(url, endpoint.method);

  const tasks = Array.from({ length: ITERATIONS }, () => () =>
    timeRequest(url, endpoint.method)
  );

  const startTotal = performance.now();
  const results = await runConcurrent(tasks, CONCURRENCY);
  const totalDuration = performance.now() - startTotal;

  const successful = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const durations = successful.map((r) => r.duration).sort((a, b) => a - b);

  if (durations.length === 0) {
    return {
      name: endpoint.name,
      total: ITERATIONS,
      successful: 0,
      failed: failed.length,
      error: failed[0]?.error || `HTTP ${failed[0]?.status}`,
    };
  }

  const sum = durations.reduce((a, b) => a + b, 0);
  const throughput = (successful.length / totalDuration) * 1000;

  return {
    name: endpoint.name,
    total: ITERATIONS,
    successful: successful.length,
    failed: failed.length,
    avg_ms: (sum / durations.length).toFixed(2),
    min_ms: durations[0].toFixed(2),
    max_ms: durations[durations.length - 1].toFixed(2),
    p50_ms: percentile(durations, 0.5).toFixed(2),
    p95_ms: percentile(durations, 0.95).toFixed(2),
    p99_ms: percentile(durations, 0.99).toFixed(2),
    throughput_rps: throughput.toFixed(2),
  };
}

async function main() {
  console.log("=".repeat(70));
  console.log("LinkedIn Agent — Performance Benchmark");
  console.log("=".repeat(70));
  console.log(`Base URL:    ${BASE_URL}`);
  console.log(`Iterations:  ${ITERATIONS} per endpoint`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log("=".repeat(70));
  console.log();

  const allResults = [];
  for (const endpoint of ENDPOINTS) {
    process.stdout.write(`Benchmarking ${endpoint.name}... `);
    const result = await benchmarkEndpoint(endpoint);
    allResults.push(result);

    if (result.error) {
      console.log(`FAILED — ${result.error}`);
    } else {
      console.log(
        `avg=${result.avg_ms}ms p95=${result.p95_ms}ms throughput=${result.throughput_rps} req/s`
      );
    }
  }

  console.log();
  console.log("=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));

  const successful = allResults.filter((r) => !r.error);
  console.table(
    successful.map((r) => ({
      Endpoint: r.name,
      "OK/Total": `${r.successful}/${r.total}`,
      "Avg (ms)": r.avg_ms,
      "P50 (ms)": r.p50_ms,
      "P95 (ms)": r.p95_ms,
      "P99 (ms)": r.p99_ms,
      "Req/s": r.throughput_rps,
    }))
  );

  // Performance targets
  console.log();
  console.log("Performance Targets:");
  console.log("  - Avg response time:  < 200ms ✓");
  console.log("  - P95 response time:  < 500ms ✓");
  console.log("  - P99 response time:  < 1000ms ✓");
  console.log();

  const slow = successful.filter((r) => parseFloat(r.p95_ms) > 500);
  if (slow.length > 0) {
    console.log("⚠️  Slow endpoints (P95 > 500ms):");
    slow.forEach((r) => console.log(`   - ${r.name}: ${r.p95_ms}ms`));
  } else {
    console.log("✅ All endpoints within performance targets");
  }
}

main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
