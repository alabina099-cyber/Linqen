import { NextResponse } from "next/server";
import { perfMonitor } from "@/lib/performance-monitor";
import { cache } from "@/lib/cache";
import { pool } from "@/lib/db";

// GET /api/performance - Expose performance metrics for monitoring
export async function GET() {
  const start = performance.now();

  // Test DB connection latency
  let dbLatency = 0;
  let dbStatus = "ok";
  try {
    const dbStart = performance.now();
    await pool.query("SELECT 1");
    dbLatency = Number((performance.now() - dbStart).toFixed(2));
  } catch (e) {
    dbStatus = "error";
  }

  const responseTime = Number((performance.now() - start).toFixed(2));

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    api: {
      responseTime,
      operations: perfMonitor.getStatsByOperation(),
      recent: perfMonitor.getRecentMetrics(20),
    },
    cache: cache.getStats(),
    database: {
      status: dbStatus,
      latency: dbLatency,
      poolStats: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    },
    memory: process.memoryUsage
      ? {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + " MB",
          heapUsed:
            Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
          heapTotal:
            Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
        }
      : null,
  });
}

// DELETE /api/performance - Reset metrics
export async function DELETE() {
  perfMonitor.reset();
  cache.clear();
  return NextResponse.json({ success: true, message: "Metrics reset" });
}
