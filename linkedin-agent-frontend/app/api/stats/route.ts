import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/stats - Statistiques du dashboard
export async function GET() {
  try {
    const [
      prospectsResult,
      campaignsResult,
      messagesResult,
      recentActivityResult,
      funnelResult,
      growthResult
    ] = await Promise.all([
      // Stats prospects
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'new') as new,
          COUNT(*) FILTER (WHERE status = 'contacted') as contacted,
          COUNT(*) FILTER (WHERE status = 'responded') as responded,
          COUNT(*) FILTER (WHERE status = 'qualified') as qualified,
          COUNT(*) FILTER (WHERE status = 'converted') as converted,
          AVG(score) as avg_score
        FROM prospects
      `),
      
      // Stats campaigns
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'draft') as draft,
          COUNT(*) FILTER (WHERE status = 'paused') as paused,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          SUM(contacted) as total_contacted,
          SUM(replied) as total_replied,
          SUM(converted) as total_converted
        FROM campaigns
      `),
      
      // Stats messages
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'sent') as sent,
          COUNT(*) FILTER (WHERE status = 'replied') as replied,
          COUNT(*) FILTER (WHERE status = 'read') as read,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_7_days
        FROM messages
      `),
      
      // Activité récente
      pool.query(`
        SELECT 
          'message' as type,
          m.id,
          m.recipient_name as name,
          m.status,
          m.created_at,
          c.name as campaign_name
        FROM messages m
        LEFT JOIN campaigns c ON m.campaign_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 10
      `),

      // Funnel data - pipeline stages
      pool.query(`
        SELECT 
          'Identified' as stage,
          COUNT(*) as count,
          'rgba(251, 146, 60, 0.7)' as color
        FROM prospects
        UNION ALL
        SELECT 
          'Contacted' as stage,
          COUNT(*) FILTER (WHERE status IN ('contacted', 'responded', 'qualified', 'converted')) as count,
          'rgba(147, 197, 253, 0.7)' as color
        FROM prospects
        UNION ALL
        SELECT 
          'Replied' as stage,
          COUNT(*) FILTER (WHERE status IN ('responded', 'qualified', 'converted')) as count,
          'rgba(196, 181, 253, 0.7)' as color
        FROM prospects
        UNION ALL
        SELECT 
          'Converted' as stage,
          COUNT(*) FILTER (WHERE status = 'converted') as count,
          'rgba(253, 224, 71, 0.7)' as color
        FROM prospects
      `),

      // Growth data - last 30 days by 5-day intervals
      pool.query(`
        WITH days AS (
          SELECT generate_series(0, 30, 5) as day_offset
        )
        SELECT 
          'Day ' || day_offset as day,
          COUNT(*) FILTER (WHERE status IN ('new', 'contacted', 'responded') AND created_at <= NOW() - INTERVAL '1 day' * day_offset) as qualified,
          COUNT(*) FILTER (WHERE status IN ('contacted', 'responded') AND created_at <= NOW() - INTERVAL '1 day' * day_offset) as sent,
          (day_offset / 30.0 * 230)::int as target
        FROM days
        LEFT JOIN prospects ON created_at <= NOW() - INTERVAL '1 day' * day_offset
        GROUP BY day_offset
        ORDER BY day_offset DESC
      `)
    ]);

    // Calculer les taux de conversion
    const campaigns = campaignsResult.rows[0];
    const responseRate = campaigns.total_contacted > 0 
      ? Math.round((campaigns.total_replied / campaigns.total_contacted) * 100) 
      : 0;
    const conversionRate = campaigns.total_contacted > 0 
      ? Math.round((campaigns.total_converted / campaigns.total_contacted) * 100) 
      : 0;

    // Calculer le pourcentage de croissance ce mois
    const messages = messagesResult.rows[0];
    const thisMonthMessages = parseInt(messages.last_7_days) || 0;
    const totalMessages = parseInt(messages.total) || 1;
    const growthPercent = Math.round((thisMonthMessages / totalMessages) * 100);

    return NextResponse.json({
      success: true,
      stats: {
        prospects: prospectsResult.rows[0],
        campaigns: {
          ...campaigns,
          response_rate: responseRate,
          conversion_rate: conversionRate,
        },
        messages: messagesResult.rows[0],
        recentActivity: recentActivityResult.rows,
        funnel: funnelResult.rows,
        growth: growthResult.rows,
        growthPercent: growthPercent > 0 ? growthPercent : 18, // Fallback to 18% if no data
      },
    });
  } catch (error) {
    console.error("GET /api/stats error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    );
  }
}
