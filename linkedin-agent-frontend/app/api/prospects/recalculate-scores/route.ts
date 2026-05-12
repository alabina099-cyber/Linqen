import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { calculateProspectScore } from "@/lib/prospectScore";

// POST /api/prospects/recalculate-scores
// Recalculates the score for every existing prospect based on their current data
export async function POST() {
  try {
    const allProspects = await query(
      `SELECT id, role, company, email, phone, location, linkedin_url, connections FROM prospects`,
      []
    );

    let updated = 0;
    for (const p of allProspects.rows) {
      const newScore = calculateProspectScore({
        role: p.role,
        company: p.company,
        email: p.email,
        phone: p.phone,
        location: p.location,
        linkedin_url: p.linkedin_url,
        connections: p.connections,
      });

      await query(
        `UPDATE prospects SET score = $1, updated_at = NOW() WHERE id = $2`,
        [newScore, p.id]
      );
      updated++;
    }

    return NextResponse.json({
      success: true,
      updated,
      message: `${updated} prospect(s) recalculé(s)`,
    });
  } catch (error) {
    console.error("recalculate-scores error:", error);
    return NextResponse.json(
      { error: "Erreur lors du recalcul", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
