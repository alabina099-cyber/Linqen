import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/bi/agent?range=30
// Module 4: AI Agent Analytics
//  - Volume actions agent vs humain
//  - Tool usage breakdown
//  - Auto vs approbation manuelle (linkedin_actions_queue)
//  - ROI estimé (€ et heures économisées)
//  - Timeline d'activité agent (par jour)
export async function GET(req: NextRequest) {
  try {
    const range = parseInt(req.nextUrl.searchParams.get("range") || "30");

    const toolsSql = `
      SELECT
        tool_name,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'success') AS success,
        COUNT(*) FILTER (WHERE status = 'error') AS errors
      FROM agent_tool_steps
      WHERE created_at > NOW() - INTERVAL '${range} days'
      GROUP BY tool_name
      ORDER BY total DESC
    `;

    const queueSql = `
      SELECT
        action_type,
        status,
        COUNT(*) AS count
      FROM linkedin_actions_queue
      WHERE created_at > NOW() - INTERVAL '${range} days'
      GROUP BY action_type, status
    `;

    const timelineSql = `
      WITH days AS (
        SELECT generate_series(
          DATE_TRUNC('day', NOW() - INTERVAL '${range} days'),
          DATE_TRUNC('day', NOW()),
          INTERVAL '1 day'
        )::date AS day
      )
      SELECT
        d.day,
        COALESCE((SELECT COUNT(*) FROM agent_tool_steps WHERE DATE_TRUNC('day', created_at)::date = d.day), 0) AS agent_actions,
        COALESCE((SELECT COUNT(*) FROM messages WHERE DATE_TRUNC('day', created_at)::date = d.day), 0) AS messages,
        COALESCE((SELECT COUNT(*) FROM linkedin_actions_queue WHERE DATE_TRUNC('day', executed_at)::date = d.day AND status = 'completed'), 0) AS executed
      FROM days d
      ORDER BY d.day ASC
    `;

    const conversationsSql = `
      SELECT
        COUNT(DISTINCT conversation_id) AS conversations,
        COUNT(*) AS messages
      FROM agent_chat_history
      WHERE created_at > NOW() - INTERVAL '${range} days'
    `;

    const [toolsR, queueR, timelineR, convR] = await Promise.all([
      pool.query(toolsSql),
      pool.query(queueSql),
      pool.query(timelineSql),
      pool.query(conversationsSql),
    ]);

    const tools = toolsR.rows.map(r => ({
      tool: r.tool_name,
      total: parseInt(r.total),
      success: parseInt(r.success) || 0,
      errors: parseInt(r.errors) || 0,
      successRate: parseInt(r.total) > 0
        ? Math.round((parseInt(r.success) / parseInt(r.total)) * 100)
        : 0,
    }));

    const totalActions = tools.reduce((s, t) => s + t.total, 0);
    const totalErrors = tools.reduce((s, t) => s + t.errors, 0);

    // Approbations
    const approvals: Record<string, Record<string, number>> = {};
    for (const r of queueR.rows) {
      const at = r.action_type || "unknown";
      const st = r.status || "unknown";
      if (!approvals[at]) approvals[at] = {};
      approvals[at][st] = parseInt(r.count);
    }
    const approvalSummary = Object.entries(approvals).map(([action_type, stats]) => {
      const total = Object.values(stats).reduce((a, b) => a + b, 0);
      const completed = stats.completed || 0;
      const pending = stats.pending_approval || 0;
      const failed = stats.failed || 0;
      return { action_type, total, completed, pending, failed };
    });

    // ROI: 2min économisées par action agent + 25€/h taux horaire estimé
    const minutesSaved = totalActions * 2;
    const hoursSaved = Math.round((minutesSaved / 60) * 10) / 10;
    const moneySaved = Math.round(hoursSaved * 25);

    return NextResponse.json({
      success: true,
      tools,
      approvalSummary,
      timeline: timelineR.rows.map(r => ({
        day: r.day,
        agentActions: parseInt(r.agent_actions) || 0,
        messages: parseInt(r.messages) || 0,
        executed: parseInt(r.executed) || 0,
      })),
      summary: {
        totalActions,
        totalErrors,
        successRate: totalActions > 0
          ? Math.round(((totalActions - totalErrors) / totalActions) * 100)
          : 0,
        conversations: parseInt(convR.rows[0]?.conversations) || 0,
        chatMessages: parseInt(convR.rows[0]?.messages) || 0,
        hoursSaved,
        moneySaved,
      },
      range,
    });
  } catch (error) {
    console.error("GET /api/bi/agent error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
