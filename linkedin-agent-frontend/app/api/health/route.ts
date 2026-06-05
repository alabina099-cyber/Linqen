import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// =============================================
// Health Check Endpoint
// Utilisé par Docker, Nginx, et monitoring tools
// =============================================

const startTime = Date.now();

export async function GET() {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};
  let overallStatus = "healthy";

  // 1. Database connectivity
  const dbStart = performance.now();
  try {
    await pool.query("SELECT 1");
    checks.database = {
      status: "ok",
      latency: Number((performance.now() - dbStart).toFixed(2)),
    };
  } catch (e) {
    checks.database = {
      status: "error",
      error: e instanceof Error ? e.message : String(e),
    };
    overallStatus = "unhealthy";
  }

  // 2. Memory usage
  const mem = process.memoryUsage();
  const heapUsedMB = mem.heapUsed / 1024 / 1024;
  const heapTotalMB = mem.heapTotal / 1024 / 1024;
  const memoryRatio = heapUsedMB / heapTotalMB;

  checks.memory = {
    status: memoryRatio < 0.9 ? "ok" : "warning",
    latency: Number(heapUsedMB.toFixed(2)),
  };
  if (memoryRatio >= 0.95) overallStatus = "degraded";

  // 3. Database pool stats
  checks.dbPool = {
    status: pool.waitingCount > 10 ? "warning" : "ok",
    latency: pool.totalCount,
  };

  const uptime = Math.floor((Date.now() - startTime) / 1000);

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: process.env.npm_package_version || "0.1.0",
      checks,
      instance: process.env.HOSTNAME || "local",
    },
    { status: overallStatus === "healthy" ? 200 : 503 }
  );
}
