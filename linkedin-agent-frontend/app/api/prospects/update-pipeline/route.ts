import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/prospects/update-pipeline — Mettre à jour automatiquement le pipeline des prospects
export async function POST(request: NextRequest) {
  try {
    // Mettre à jour les prospects qui ont reçu un message mais n'ont pas de statut 'messaged'
    await query(`
      UPDATE prospects p
      SET status = 'messaged',
          last_contacted_at = COALESCE(p.last_contacted_at, NOW()),
          updated_at = NOW()
      WHERE p.status = 'connected'
        AND EXISTS (
          SELECT 1 FROM linkedin_actions_queue laq
          WHERE laq.target_url = p.linkedin_url
            AND laq.action_type = 'send_message'
            AND laq.status = 'completed'
        )
    `);

    // Mettre à jour les prospects qui ont répondu
    await query(`
      UPDATE prospects p
      SET status = 'replied',
          updated_at = NOW()
      WHERE p.status IN ('messaged', 'followup_sent')
        AND EXISTS (
          SELECT 1 FROM linkedin_actions_queue laq
          WHERE laq.target_url = p.linkedin_url
            AND laq.action_type = 'receive_message'
            AND laq.status = 'completed'
            AND laq.executed_at > COALESCE(p.last_contacted_at, p.created_at)
        )
    `);

    // Mettre à jour les prospects qui ont cliqué sur un lien
    await query(`
      UPDATE prospects p
      SET status = 'clicked_link',
          updated_at = NOW()
      WHERE p.status IN ('messaged', 'replied', 'followup_sent')
        AND EXISTS (
          SELECT 1 FROM linkedin_actions_queue laq
          WHERE laq.target_url = p.linkedin_url
            AND laq.action_type = 'click_link'
            AND laq.status = 'completed'
        )
    `);

    // Mettre à jour les prospects convertis
    await query(`
      UPDATE prospects p
      SET status = 'converted',
          updated_at = NOW()
      WHERE p.status IN ('clicked_link', 'replied')
        AND EXISTS (
          SELECT 1 FROM linkedin_actions_queue laq
          WHERE laq.target_url = p.linkedin_url
            AND laq.action_type = 'conversion'
            AND laq.status = 'completed'
        )
    `);

    // Marquer comme 'lost' les prospects qui n'ont pas répondu après 14 jours
    await query(`
      UPDATE prospects p
      SET status = 'lost',
          updated_at = NOW()
      WHERE p.status IN ('messaged', 'followup_sent')
        AND p.last_contacted_at < NOW() - INTERVAL '14 days'
        AND NOT EXISTS (
          SELECT 1 FROM linkedin_actions_queue laq
          WHERE laq.target_url = p.linkedin_url
            AND laq.action_type = 'receive_message'
            AND laq.status = 'completed'
            AND laq.executed_at > p.last_contacted_at
        )
    `);

    // Récupérer les statistiques de mise à jour
    const statsResult = await query(`
      SELECT status, COUNT(*) as count
      FROM prospects
      GROUP BY status
      ORDER BY status
    `);

    const stats = statsResult.rows.reduce((acc: Record<string, number>, row: any) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      message: "Pipeline des prospects mis à jour avec succès",
      stats,
    });
  } catch (error) {
    console.error("POST /api/prospects/update-pipeline error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du pipeline" },
      { status: 500 }
    );
  }
}
