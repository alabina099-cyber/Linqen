import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/prospects/sync-status
// Synchronise le statut des prospects avec les actions LinkedIn et messages envoyés
export async function POST() {
  try {
    // Mettre à jour les prospects qui ont reçu une demande de connexion mais sont encore en "new"
    const connectionResult = await query(
      `UPDATE prospects p
       SET status = 'identified', updated_at = NOW()
       WHERE p.status = 'new'
         AND EXISTS (
           SELECT 1 FROM linkedin_actions_queue laq
           WHERE laq.target_url = p.linkedin_url
             AND laq.action_type IN ('send_connection', 'search_and_connection')
             AND laq.status = 'completed'
         )
       RETURNING p.id, p.name, p.linkedin_url, p.status`,
      []
    );

    // Mettre à jour les prospects qui ont accepté une connexion mais sont encore en "identified"
    const acceptedResult = await query(
      `UPDATE prospects p
       SET status = 'connected', updated_at = NOW()
       WHERE p.status = 'identified'
         AND EXISTS (
           SELECT 1 FROM linkedin_actions_queue laq
           WHERE laq.target_url = p.linkedin_url
             AND laq.action_type = 'connection_accepted'
             AND laq.status = 'completed'
         )
       RETURNING p.id, p.name, p.linkedin_url, p.status`,
      []
    );

    // Mettre à jour les prospects qui ont un message envoyé mais sont encore en statut "new" ou "identified"
    const result = await query(
      `UPDATE prospects p
       SET status = 'contacted', updated_at = NOW()
       FROM messages m
       WHERE (
         p.id = m.prospect_id
         OR LOWER(p.name) = LOWER(m.recipient_name)
       )
       AND p.status IN ('identified', 'connected')
       AND m.status = 'sent'
       RETURNING p.id, p.name, p.linkedin_url, p.status`,
      []
    );

    return NextResponse.json({
      success: true,
      updated_count: result.rows.length,
      updated_prospects: result.rows,
      connection_updated: connectionResult.rows.length,
      accepted_updated: acceptedResult.rows.length,
    });
  } catch (error) {
    console.error("POST /api/prospects/sync-status error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur sync", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
