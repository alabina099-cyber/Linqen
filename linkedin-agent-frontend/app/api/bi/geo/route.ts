import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET /api/bi/geo?range=30
// Module 3: Prospect Intelligence Map
//  - Geographic density + conversion by location
//  - Industry × seniority treemap
//  - Score distribution
//  - ICP fit quadrant (score × engagement)
export async function GET(req: NextRequest) {
  try {
    const range = parseInt(req.nextUrl.searchParams.get("range") || "30");

    const geoSql = `
      SELECT
        COALESCE(NULLIF(TRIM(location), ''), 'Unknown') AS location,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'converted') AS converted,
        ROUND(AVG(score)::numeric, 0) AS avg_score
      FROM prospects
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY location
      ORDER BY total DESC
      LIMIT 25
    `;

    const treemapSql = `
      SELECT
        COALESCE(NULLIF(TRIM(industry), ''), 'Autre') AS industry,
        COUNT(*) AS total,
        ROUND(AVG(score)::numeric, 0) AS avg_score,
        COUNT(*) FILTER (WHERE status = 'converted') AS converted
      FROM prospects
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY industry
      ORDER BY total DESC
      LIMIT 12
    `;

    const scoreSql = `
      SELECT
        CASE
          WHEN score < 20 THEN '0-20'
          WHEN score < 40 THEN '20-40'
          WHEN score < 60 THEN '40-60'
          WHEN score < 80 THEN '60-80'
          ELSE '80-100'
        END AS bucket,
        COUNT(*) AS count,
        COUNT(*) FILTER (WHERE status = 'converted') AS converted
      FROM prospects
      WHERE created_at > NOW() - INTERVAL '1 day' * $1
      GROUP BY 1
      ORDER BY 1
    `;

    // ICP quadrant: score (y) × engagement (x = number of messages received / sent to the prospect)
    const icpSql = `
      SELECT
        p.id,
        p.name,
        p.company,
        p.score,
        p.status,
        COALESCE((
          SELECT COUNT(*) FROM messages m WHERE m.prospect_id = p.id
        ), 0) AS engagement
      FROM prospects p
      WHERE p.created_at > NOW() - INTERVAL '1 day' * $1
      ORDER BY p.score DESC
      LIMIT 200
    `;

    const [geoR, tmR, scoreR, icpR] = await Promise.all([
      pool.query(geoSql, [range]),
      pool.query(treemapSql, [range]),
      pool.query(scoreSql, [range]),
      pool.query(icpSql, [range]),
    ]);

    return NextResponse.json({
      success: true,
      geo: geoR.rows.map(r => ({
        location: r.location,
        total: parseInt(r.total),
        converted: parseInt(r.converted) || 0,
        avgScore: parseInt(r.avg_score) || 0,
        conversionRate: parseInt(r.total) > 0
          ? Math.round((parseInt(r.converted) / parseInt(r.total)) * 100)
          : 0,
      })),
      industries: tmR.rows.map(r => ({
        name: r.industry,
        size: parseInt(r.total),
        avgScore: parseInt(r.avg_score) || 0,
        converted: parseInt(r.converted) || 0,
      })),
      scoreDistribution: scoreR.rows.map(r => ({
        bucket: r.bucket,
        count: parseInt(r.count),
        converted: parseInt(r.converted) || 0,
      })),
      icpQuadrant: icpR.rows.map(r => ({
        id: r.id,
        name: r.name,
        company: r.company,
        score: parseInt(r.score) || 0,
        engagement: parseInt(r.engagement) || 0,
        status: r.status,
      })),
      range,
    });
  } catch (error) {
    console.error("GET /api/bi/geo error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
