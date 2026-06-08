import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/bi/kpi?range=30
// Hero KPIs avec comparaison période précédente
export async function GET(req: NextRequest) {
  try {
    const range = parseInt(req.nextUrl.searchParams.get("range") || "30");

    const sql = `
      WITH current_period AS (
        SELECT
          (SELECT COUNT(*) FROM prospects WHERE created_at > NOW() - INTERVAL '1 day' * $1) AS prospects,
          (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '1 day' * $1) AS messages_sent,
          (SELECT COUNT(*) FROM messages WHERE status = 'replied' AND created_at > NOW() - INTERVAL '1 day' * $1) AS replies,
          (SELECT COUNT(*) FROM prospects WHERE status = 'converted' AND updated_at > NOW() - INTERVAL '1 day' * $1) AS conversions,
          (SELECT COUNT(*) FROM agent_tool_steps WHERE created_at > NOW() - INTERVAL '1 day' * $1) AS agent_actions,
          (SELECT COALESCE(AVG(score), 0)::int FROM prospects WHERE created_at > NOW() - INTERVAL '1 day' * $1) AS avg_score
      ),
      prev_period AS (
        SELECT
          (SELECT COUNT(*) FROM prospects WHERE created_at > NOW() - INTERVAL '1 day' * $2 AND created_at <= NOW() - INTERVAL '1 day' * $1) AS prospects,
          (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '1 day' * $2 AND created_at <= NOW() - INTERVAL '1 day' * $1) AS messages_sent,
          (SELECT COUNT(*) FROM messages WHERE status = 'replied' AND created_at > NOW() - INTERVAL '1 day' * $2 AND created_at <= NOW() - INTERVAL '1 day' * $1) AS replies,
          (SELECT COUNT(*) FROM prospects WHERE status = 'converted' AND updated_at > NOW() - INTERVAL '1 day' * $2 AND updated_at <= NOW() - INTERVAL '1 day' * $1) AS conversions,
          (SELECT COUNT(*) FROM agent_tool_steps WHERE created_at > NOW() - INTERVAL '1 day' * $2 AND created_at <= NOW() - INTERVAL '1 day' * $1) AS agent_actions
      )
      SELECT
        c.prospects, c.messages_sent, c.replies, c.conversions, c.agent_actions, c.avg_score,
        p.prospects AS prev_prospects,
        p.messages_sent AS prev_messages_sent,
        p.replies AS prev_replies,
        p.conversions AS prev_conversions,
        p.agent_actions AS prev_agent_actions
      FROM current_period c, prev_period p
    `;

    const r = await pool.query(sql, [range, range * 2]);
    const row = r.rows[0];

    const pct = (cur: number, prev: number) => {
      if (!prev) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    };

    const replyRate = row.messages_sent > 0
      ? Math.round((row.replies / row.messages_sent) * 100)
      : 0;
    const prevReplyRate = row.prev_messages_sent > 0
      ? Math.round((row.prev_replies / row.prev_messages_sent) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      kpis: {
        prospects: {
          value: parseInt(row.prospects),
          delta: pct(row.prospects, row.prev_prospects),
        },
        messages: {
          value: parseInt(row.messages_sent),
          delta: pct(row.messages_sent, row.prev_messages_sent),
        },
        replyRate: {
          value: replyRate,
          delta: replyRate - prevReplyRate,
        },
        conversions: {
          value: parseInt(row.conversions),
          delta: pct(row.conversions, row.prev_conversions),
        },
        avgScore: {
          value: parseInt(row.avg_score),
        },
        agentActions: {
          value: parseInt(row.agent_actions),
          delta: pct(row.agent_actions, row.prev_agent_actions),
        },
      },
      range,
    });
  } catch (error) {
    console.error("GET /api/bi/kpi error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
