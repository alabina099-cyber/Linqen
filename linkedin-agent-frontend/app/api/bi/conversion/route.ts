import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/bi/conversion?range=30
// Module 1: Conversion Intelligence
//  - Funnel by stage with conversion rate + drop-off
//  - Average cycle time between stages (based on created_at vs updated_at)
//  - Weekly cohort: prospects entered in week N and their current status
//  - Sankey data (source → target → value)
export async function GET(req: NextRequest) {
  try {
    const range = parseInt(req.nextUrl.searchParams.get("range") || "30");

    const stages = [
      { key: "identified", label: "Identified", color: "#94a3b8" },
      { key: "connected", label: "Connected", color: "#60a5fa" },
      { key: "contacted", label: "Contacted", color: "#3b82f6" },
      { key: "responded", label: "Responded", color: "#8b5cf6" },
      { key: "interested", label: "Interested", color: "#a855f7" },
      { key: "converted", label: "Converted", color: "#10b981" },
    ];

    // Cumulative funnel: each step counts prospects who have AT LEAST reached this stage
    const order = ["identified", "connected", "contacted", "responded", "interested", "converted"];
    const reachedFilter = (stage: string) => {
      const idx = order.indexOf(stage);
      const reached = order.slice(idx);
      return reached.map(s => `'${s}'`).join(",");
    };

    const funnelSql = `
      SELECT
        ${stages.map(s => `
          COUNT(*) FILTER (WHERE status IN (${reachedFilter(s.key)})) AS ${s.key}
        `).join(",")}
      FROM prospects
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
    `;

    // Average cycle time (days between created_at and updated_at) by current status
    const cycleSql = `
      SELECT
        status,
        ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric, 1) AS avg_days,
        COUNT(*) AS count
      FROM prospects
      WHERE updated_at > created_at
        AND created_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY status
    `;

    // Weekly cohort
    const cohortSql = `
      WITH cohorts AS (
        SELECT
          DATE_TRUNC('week', created_at)::date AS cohort_week,
          status,
          COUNT(*) AS count
        FROM prospects
        WHERE created_at > NOW() - INTERVAL '1 day' * $1
        GROUP BY 1, 2
      )
      SELECT
        cohort_week,
        SUM(count) FILTER (WHERE status = 'identified') AS identified,
        SUM(count) FILTER (WHERE status = 'connected') AS connected,
        SUM(count) FILTER (WHERE status = 'contacted') AS contacted,
        SUM(count) FILTER (WHERE status = 'responded') AS responded,
        SUM(count) FILTER (WHERE status = 'interested') AS interested,
        SUM(count) FILTER (WHERE status = 'converted') AS converted,
        SUM(count) AS total
      FROM cohorts
      GROUP BY cohort_week
      ORDER BY cohort_week ASC
    `;

    const [funnelR, cycleR, cohortR] = await Promise.all([
      pool.query(funnelSql, [range]),
      pool.query(cycleSql, [range]),
      pool.query(cohortSql, [range]),
    ]);

    const f = funnelR.rows[0];
    const funnel = stages.map((s, i) => {
      const value = parseInt(f[s.key]) || 0;
      const prev = i === 0 ? value : parseInt(f[stages[i - 1].key]) || 0;
      const conversionFromPrev = prev > 0 ? Math.round((value / prev) * 1000) / 10 : 0;
      const dropOff = prev - value;
      return {
        stage: s.label,
        key: s.key,
        value,
        color: s.color,
        conversionFromPrev,
        dropOff,
      };
    });

    // Sankey nodes & links
    const nodes = stages.map(s => ({ name: s.label }));
    const links: Array<{ source: number; target: number; value: number }> = [];
    for (let i = 0; i < stages.length - 1; i++) {
      const v = parseInt(f[stages[i + 1].key]) || 0;
      if (v > 0) links.push({ source: i, target: i + 1, value: v });
    }

    return NextResponse.json({
      success: true,
      funnel,
      sankey: { nodes, links },
      cycleTime: cycleR.rows.map(r => ({
        status: r.status,
        avgDays: parseFloat(r.avg_days) || 0,
        count: parseInt(r.count),
      })),
      cohorts: cohortR.rows.map(r => ({
        week: r.cohort_week,
        total: parseInt(r.total) || 0,
        identified: parseInt(r.identified) || 0,
        connected: parseInt(r.connected) || 0,
        contacted: parseInt(r.contacted) || 0,
        responded: parseInt(r.responded) || 0,
        interested: parseInt(r.interested) || 0,
        converted: parseInt(r.converted) || 0,
      })),
      range,
    });
  } catch (error) {
    console.error("GET /api/bi/conversion error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
