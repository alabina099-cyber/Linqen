import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/prospects/cleanup
// Supprime tous les prospects avec les statuts obsolètes ('new', 'lost')
export async function POST() {
  try {
    // D'abord, supprimer les messages associés aux prospects 'new' et 'lost'
    await query(
      `DELETE FROM messages 
       WHERE prospect_id IN (SELECT id FROM prospects WHERE status IN ('new', 'lost'))`,
      []
    );

    // Ensuite, supprimer les prospects 'new' et 'lost'
    const result = await query(
      `DELETE FROM prospects WHERE status IN ('new', 'lost') RETURNING id, name, linkedin_url, status`,
      []
    );

    return NextResponse.json({
      success: true,
      deleted_count: result.rows.length,
      deleted_prospects: result.rows,
    });
  } catch (error) {
    console.error("POST /api/prospects/cleanup error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors du nettoyage", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
