import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/prospects/sync-status
// Synchronise le statut des prospects qui ont des messages envoyés mais sont encore en "new"
export async function POST() {
  try {
    // Mettre à jour les prospects qui ont un message envoyé mais sont encore en statut "new"
    const result = await query(
      `UPDATE prospects p
       SET status = 'contacted', updated_at = NOW()
       FROM messages m
       WHERE (
         p.id = m.prospect_id
         OR LOWER(p.name) = LOWER(m.recipient_name)
       )
       AND p.status = 'new'
       AND m.status = 'sent'
       RETURNING p.id, p.name, p.linkedin_url, p.status`,
      []
    );

    return NextResponse.json({
      success: true,
      updated_count: result.rows.length,
      updated_prospects: result.rows,
    });
  } catch (error) {
    console.error("POST /api/prospects/sync-status error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur sync", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
