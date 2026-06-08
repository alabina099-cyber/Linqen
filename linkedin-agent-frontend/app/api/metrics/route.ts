import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";
import crypto from "crypto";

// =============================================
// Endpoint Prometheus metrics (text exposition format)
// Scrapé par Prometheus toutes les 15s.
//
// Sécurité : si METRICS_BEARER_TOKEN est défini, on exige
//   Authorization: Bearer <token>
// (comparaison à temps constant). Si le secret n'est pas défini,
// l'endpoint reste ouvert mais journalise un warning (utile en dev).
// =============================================

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const startTime = Date.now();

function authorized(req: NextRequest): boolean {
  const expected = process.env.METRICS_BEARER_TOKEN;
  if (!expected) {
    // Mode permissif (dev) — on ne bloque pas mais on log.
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[/api/metrics] METRICS_BEARER_TOKEN non défini en production — endpoint exposé sans auth"
      );
    }
    return true;
  }
  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  const provided = Buffer.from(m[1]);
  const want = Buffer.from(expected);
  if (provided.length !== want.length) return false;
  try {
    return crypto.timingSafeEqual(provided, want);
  } catch {
    return false;
  }
}

function metric(
  name: string,
  help: string,
  type: "counter" | "gauge",
  value: number,
  labels: Record<string, string> = {}
) {
  const labelStr = Object.entries(labels)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`)
    .join(",");
  return [
    `# HELP ${name} ${help}`,
    `# TYPE ${name} ${type}`,
    `${name}${labelStr ? `{${labelStr}}` : ""} ${value}`,
  ].join("\n");
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="metrics"' },
    });
  }
  const lines: string[] = [];
  const instance = process.env.HOSTNAME || "local";

  lines.push(
    metric(
      "nextjs_uptime_seconds",
      "Process uptime",
      "counter",
      Math.floor((Date.now() - startTime) / 1000),
      { instance }
    )
  );

  const mem = process.memoryUsage();
  lines.push(
    metric("nextjs_memory_heap_used_bytes", "Heap used", "gauge", mem.heapUsed, { instance })
  );
  lines.push(
    metric("nextjs_memory_heap_total_bytes", "Heap total", "gauge", mem.heapTotal, { instance })
  );
  lines.push(metric("nextjs_memory_rss_bytes", "RSS", "gauge", mem.rss, { instance }));

  lines.push(
    metric("db_pool_total", "DB pool total connections", "gauge", pool.totalCount, { instance })
  );
  lines.push(
    metric("db_pool_idle", "DB pool idle connections", "gauge", pool.idleCount, { instance })
  );
  lines.push(
    metric("db_pool_waiting", "DB pool waiting connections", "gauge", pool.waitingCount, {
      instance,
    })
  );

  let dbUp = 0;
  try {
    await pool.query("SELECT 1");
    dbUp = 1;
  } catch {
    dbUp = 0;
  }
  lines.push(metric("db_up", "Database reachable", "gauge", dbUp, { instance }));

  // Métriques métier (best-effort, ne bloquent pas si DB en panne)
  try {
    const [actions, prospects, workers] = await Promise.all([
      pool.query(
        `SELECT status, COUNT(*)::int AS count FROM linkedin_actions_queue
         WHERE created_at > NOW() - INTERVAL '24 hours' GROUP BY status`
      ),
      pool.query(`SELECT status, COUNT(*)::int AS count FROM prospects GROUP BY status`),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM worker_heartbeats
         WHERE last_seen > NOW() - INTERVAL '2 minutes'`
      ),
    ]);

    for (const row of actions.rows) {
      lines.push(
        metric(
          "actions_24h",
          "Actions queue counts (last 24h)",
          "gauge",
          row.count,
          { status: row.status }
        )
      );
    }
    for (const row of prospects.rows) {
      lines.push(
        metric("prospects_total", "Prospects by status", "gauge", row.count, {
          status: row.status,
        })
      );
    }
    lines.push(
      metric(
        "workers_alive",
        "Workers with heartbeat in last 2 minutes",
        "gauge",
        workers.rows[0]?.count ?? 0
      )
    );
  } catch {
    // Tolérant — la métrique db_up indique déjà l'état
  }

  return new NextResponse(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
