import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/bi/analytics?range=30
// Endpoint agrégé: retourne un résumé global de tous les modules BI en un seul appel.
// Utile pour des exports ou intégrations externes.
export async function GET(req: NextRequest) {
  try {
    const range = parseInt(req.nextUrl.searchParams.get("range") || "30");

    const summarySql = `
      SELECT
        (SELECT COUNT(*) FROM prospects WHERE created_at > NOW() - INTERVAL '1 day' * $1) AS prospects,
        (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '1 day' * $1) AS messages_sent,
        (SELECT COUNT(*) FILTER (WHERE status = 'replied') FROM messages WHERE created_at > NOW() - INTERVAL '1 day' * $1) AS replies,
        (SELECT COUNT(*) FROM prospects WHERE status = 'converted' AND updated_at > NOW() - INTERVAL '1 day' * $1) AS conversions,
        (SELECT COUNT(*) FROM agent_tool_steps WHERE created_at > NOW() - INTERVAL '1 day' * $1) AS agent_actions,
        (SELECT COALESCE(AVG(score), 0)::int FROM prospects WHERE created_at > NOW() - INTERVAL '1 day' * $1) AS avg_score,
        (SELECT COUNT(DISTINCT location) FROM prospects WHERE created_at > NOW() - INTERVAL '1 day' * $1 AND location IS NOT NULL AND location <> '') AS locations,
        (SELECT COUNT(DISTINCT industry) FROM prospects WHERE created_at > NOW() - INTERVAL '1 day' * $1 AND industry IS NOT NULL AND industry <> '') AS industries
    `;

    const funnelSql = `
      SELECT
        COUNT(*) FILTER (WHERE status IN ('identified','connected','contacted','responded','interested','converted')) AS identified,
        COUNT(*) FILTER (WHERE status IN ('connected','contacted','responded','interested','converted')) AS connected,
        COUNT(*) FILTER (WHERE status IN ('contacted','responded','interested','converted')) AS contacted,
        COUNT(*) FILTER (WHERE status IN ('responded','interested','converted')) AS responded,
        COUNT(*) FILTER (WHERE status IN ('interested','converted')) AS interested,
        COUNT(*) FILTER (WHERE status = 'converted') AS converted
      FROM prospects
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
    `;

    const [summaryR, funnelR] = await Promise.all([
      pool.query(summarySql, [range]),
      pool.query(funnelSql, [range]),
    ]);

    const s = summaryR.rows[0];
    const f = funnelR.rows[0];

    const messages = parseInt(s.messages_sent) || 0;
    const replies = parseInt(s.replies) || 0;
    const replyRate = messages > 0 ? Math.round((replies / messages) * 100) : 0;

    return NextResponse.json({
      success: true,
      range,
      summary: {
        prospects: parseInt(s.prospects) || 0,
        messagesSent: messages,
        replies,
        replyRate,
        conversions: parseInt(s.conversions) || 0,
        agentActions: parseInt(s.agent_actions) || 0,
        avgScore: parseInt(s.avg_score) || 0,
        locations: parseInt(s.locations) || 0,
        industries: parseInt(s.industries) || 0,
      },
      funnel: {
        identified: parseInt(f.identified) || 0,
        connected: parseInt(f.connected) || 0,
        contacted: parseInt(f.contacted) || 0,
        responded: parseInt(f.responded) || 0,
        interested: parseInt(f.interested) || 0,
        converted: parseInt(f.converted) || 0,
      },
    });
  } catch (error) {
    console.error("GET /api/bi/analytics error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
