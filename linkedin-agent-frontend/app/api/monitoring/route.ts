import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { logger } from "@/lib/logger";
import { perfMonitor } from "@/lib/performance-monitor";
import { cache } from "@/lib/cache";

// =============================================
// Real-Time Monitoring Endpoint
// Vue agrégée de l'état de tout le système
// =============================================

const startTime = Date.now();

export async function GET() {
  const data: Record<string, any> = {
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  // 1. System health
  data.system = {
    nodeVersion: process.version,
    platform: process.platform,
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + " MB",
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
    },
    instance: process.env.HOSTNAME || "local",
  };

  // 2. Database stats
  try {
    const dbStart = performance.now();
    const [actionsResult, prospectsResult, campaignsResult, recentActions] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM linkedin_actions_queue GROUP BY status`),
      pool.query(`SELECT status, COUNT(*) as count FROM prospects GROUP BY status`),
      pool.query(`SELECT status, COUNT(*) as count FROM campaigns GROUP BY status`),
      pool.query(
        `SELECT action_type, status, COUNT(*) as count
         FROM linkedin_actions_queue
         WHERE created_at > NOW() - INTERVAL '1 hour'
         GROUP BY action_type, status`
      ),
    ]);

    data.database = {
      latency: Number((performance.now() - dbStart).toFixed(2)),
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      actions: Object.fromEntries(actionsResult.rows.map((r) => [r.status, parseInt(r.count)])),
      prospects: Object.fromEntries(prospectsResult.rows.map((r) => [r.status, parseInt(r.count)])),
      campaigns: Object.fromEntries(campaignsResult.rows.map((r) => [r.status, parseInt(r.count)])),
      lastHour: recentActions.rows,
    };
  } catch (e) {
    data.database = { error: e instanceof Error ? e.message : String(e) };
  }

  // 3. Performance metrics
  data.performance = {
    api: perfMonitor.getStatsByOperation(),
    cache: cache.getStats(),
  };

  // 4. Logs récents
  data.logs = {
    stats: logger.getStats(),
    recentErrors: logger.getRecent(10, "warn"),
  };

  // 5. Extension connectivity (basé sur l'activité récente)
  try {
    const extensionActivity = await pool.query(
      `SELECT MAX(executed_at) as last_action,
              COUNT(*) FILTER (WHERE executed_at > NOW() - INTERVAL '5 minutes') as recent_actions
       FROM linkedin_actions_queue
       WHERE status = 'completed'`
    );
    const row = extensionActivity.rows[0];
    const lastAction = row.last_action ? new Date(row.last_action) : null;
    const minutesSinceLast = lastAction
      ? Math.floor((Date.now() - lastAction.getTime()) / 60000)
      : null;

    data.extension = {
      status: minutesSinceLast !== null && minutesSinceLast < 15 ? "connected" : "idle",
      lastAction: lastAction?.toISOString() || null,
      minutesSinceLast,
      recentActions: parseInt(row.recent_actions || "0"),
    };
  } catch (e) {
    data.extension = { error: "unavailable" };
  }

  return NextResponse.json({ success: true, ...data });
}
