// =============================================
// Load Test Script — simulates concurrent users
// Usage: node scripts/load-test.js
// =============================================

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const USERS = parseInt(process.env.USERS || "10");
const DURATION_SEC = parseInt(process.env.DURATION || "30");

const SCENARIOS = [
  { weight: 30, path: "/api/campaigns" },
  { weight: 30, path: "/api/prospects?limit=50" },
  { weight: 15, path: "/api/stats" },
  { weight: 15, path: "/api/notifications" },
  { weight: 10, path: "/api/linkedin-actions?limit=50" },
];

const totalWeight = SCENARIOS.reduce((s, sc) => s + sc.weight, 0);

function pickScenario() {
  let r = Math.random() * totalWeight;
  for (const sc of SCENARIOS) {
    r -= sc.weight;
    if (r <= 0) return sc;
  }
  return SCENARIOS[0];
}

const stats = {
  total: 0,
  success: 0,
  failed: 0,
  latencies: [],
  errors: {},
};

async function userLoop(stopAt, userId) {
  while (Date.now() < stopAt) {
    const sc = pickScenario();
    const start = performance.now();
    try {
      const res = await fetch(`${BASE_URL}${sc.path}`);
      await res.text();
      const duration = performance.now() - start;
      stats.total++;
      stats.latencies.push(duration);
      if (res.ok) {
        stats.success++;
      } else {
        stats.failed++;
        stats.errors[`HTTP_${res.status}`] =
          (stats.errors[`HTTP_${res.status}`] || 0) + 1;
      }
    } catch (e) {
      stats.total++;
      stats.failed++;
      stats.errors[e.message] = (stats.errors[e.message] || 0) + 1;
    }
    // Think time entre 100ms et 500ms
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 400));
  }
}

async function main() {
  console.log("=".repeat(70));
  console.log("LinkedIn Agent — Load Test");
  console.log("=".repeat(70));
  console.log(`Base URL:        ${BASE_URL}`);
  console.log(`Virtual users:   ${USERS}`);
  console.log(`Duration:        ${DURATION_SEC}s`);
  console.log("=".repeat(70));
  console.log();

  const stopAt = Date.now() + DURATION_SEC * 1000;
  const users = Array.from({ length: USERS }, (_, i) => userLoop(stopAt, i));

  // Progress bar
  const progressInterval = setInterval(() => {
    const elapsed = Math.min(
      DURATION_SEC,
      (Date.now() - (stopAt - DURATION_SEC * 1000)) / 1000
    );
    process.stdout.write(
      `\rRunning... ${elapsed.toFixed(0)}/${DURATION_SEC}s | requests: ${stats.total} | success: ${stats.success} | failed: ${stats.failed}`
    );
  }, 1000);

  await Promise.all(users);
  clearInterval(progressInterval);
  console.log();
  console.log();

  // Compute stats
  const sorted = stats.latencies.sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const p = (q) => sorted[Math.floor((sorted.length - 1) * q)] || 0;

  console.log("=".repeat(70));
  console.log("RESULTS");
  console.log("=".repeat(70));
  console.log(`Total requests:    ${stats.total}`);
  console.log(`Successful:        ${stats.success} (${((stats.success / stats.total) * 100).toFixed(2)}%)`);
  console.log(`Failed:            ${stats.failed} (${((stats.failed / stats.total) * 100).toFixed(2)}%)`);
  console.log(`Throughput:        ${(stats.total / DURATION_SEC).toFixed(2)} req/s`);
  console.log();
  console.log("Latency:");
  console.log(`  avg:   ${(sum / sorted.length).toFixed(2)}ms`);
  console.log(`  min:   ${sorted[0]?.toFixed(2)}ms`);
  console.log(`  p50:   ${p(0.5).toFixed(2)}ms`);
  console.log(`  p95:   ${p(0.95).toFixed(2)}ms`);
  console.log(`  p99:   ${p(0.99).toFixed(2)}ms`);
  console.log(`  max:   ${sorted[sorted.length - 1]?.toFixed(2)}ms`);

  if (Object.keys(stats.errors).length > 0) {
    console.log();
    console.log("Errors:");
    for (const [err, count] of Object.entries(stats.errors)) {
      console.log(`  ${err}: ${count}`);
    }
  }
}

main().catch((e) => {
  console.error("Load test failed:", e);
  process.exit(1);
});
