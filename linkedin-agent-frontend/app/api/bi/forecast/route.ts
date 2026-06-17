import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/bi/forecast?range=30&horizon=30
// Module 5: Predictive Forecast (simple linear regression)
//  - Daily history
//  - Future projection (linear OLS)
//  - Smart alerts
//  - What-if simulator data
function linearRegression(points: Array<{ x: number; y: number }>) {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export async function GET(req: NextRequest) {
  try {
    const range = parseInt(req.nextUrl.searchParams.get("range") || "30");
    const horizon = parseInt(req.nextUrl.searchParams.get("horizon") || "30");

    const sql = `
      WITH days AS (
        SELECT generate_series(
          DATE_TRUNC('day', NOW() - INTERVAL '1 day' * $1),
          DATE_TRUNC('day', NOW()),
          INTERVAL '1 day'
        )::date AS day
      )
      SELECT
        d.day,
        COALESCE((SELECT COUNT(*) FROM prospects WHERE DATE_TRUNC('day', created_at)::date = d.day), 0) AS new_prospects,
        COALESCE((SELECT COUNT(*) FROM messages WHERE DATE_TRUNC('day', created_at)::date = d.day), 0) AS messages,
        COALESCE((SELECT COUNT(*) FROM messages WHERE DATE_TRUNC('day', created_at)::date = d.day AND status = 'replied'), 0) AS replies,
        COALESCE((SELECT COUNT(*) FROM prospects WHERE DATE_TRUNC('day', updated_at)::date = d.day AND status = 'converted'), 0) AS conversions
      FROM days d
      ORDER BY d.day ASC
    `;

    const r = await pool.query(sql, [range]);
    const rows = r.rows;

    const history = rows.map((row, i) => ({
      day: row.day,
      x: i,
      newProspects: parseInt(row.new_prospects) || 0,
      messages: parseInt(row.messages) || 0,
      replies: parseInt(row.replies) || 0,
      conversions: parseInt(row.conversions) || 0,
    }));

    const buildSeries = (key: "newProspects" | "messages" | "replies" | "conversions") => {
      const points = history.map(h => ({ x: h.x, y: h[key] }));
      return linearRegression(points);
    };

    const regProspects = buildSeries("newProspects");
    const regMessages = buildSeries("messages");
    const regConversions = buildSeries("conversions");
    const regReplies = buildSeries("replies");

    const lastX = history.length;
    const projection = [];
    for (let i = 0; i < horizon; i++) {
      const x = lastX + i;
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      projection.push({
        day: date.toISOString().slice(0, 10),
        newProspects: Math.max(0, Math.round(regProspects.slope * x + regProspects.intercept)),
        messages: Math.max(0, Math.round(regMessages.slope * x + regMessages.intercept)),
        replies: Math.max(0, Math.round(regReplies.slope * x + regReplies.intercept)),
        conversions: Math.max(0, Math.round(regConversions.slope * x + regConversions.intercept)),
        forecast: true,
      });
    }

    // Aggregated stats
    const totalConversions = history.reduce((s, h) => s + h.conversions, 0);
    const projectedConversions = projection.reduce((s, p) => s + p.conversions, 0);
    const avgDailyConversions = totalConversions / Math.max(1, history.length);
    const avgReplyRate = (() => {
      const m = history.reduce((s, h) => s + h.messages, 0);
      const r = history.reduce((s, h) => s + h.replies, 0);
      return m > 0 ? Math.round((r / m) * 100) : 0;
    })();

    // Alerts
    const alerts = [];
    if (regConversions.slope > 0) {
      alerts.push({
        type: "positive",
        title: "Uptrend detected",
        message: `Conversions are increasing by an average of ${(regConversions.slope * 7).toFixed(1)}/week.`,
      });
    } else if (regConversions.slope < -0.05) {
      alerts.push({
        type: "warning",
        title: "Downtrend",
        message: `Conversions are declining. Recommended action: review underperforming templates.`,
      });
    }
    if (avgReplyRate > 20) {
      alerts.push({
        type: "positive",
        title: "Excellent reply rate",
        message: `${avgReplyRate}% responses — well above LinkedIn average (5-15%).`,
      });
    }
    if (regMessages.slope < 0) {
      alerts.push({
        type: "info",
        title: "Sending volume declining",
        message: "Consider increasing daily volume to maintain growth.",
      });
    }

    return NextResponse.json({
      success: true,
      history,
      projection,
      regression: {
        prospects: regProspects,
        messages: regMessages,
        replies: regReplies,
        conversions: regConversions,
      },
      summary: {
        totalConversions,
        projectedConversions,
        avgDailyConversions: Math.round(avgDailyConversions * 10) / 10,
        avgReplyRate,
      },
      alerts,
      range,
      horizon,
    });
  } catch (error) {
    console.error("GET /api/bi/forecast error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
