import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// POST /api/prospects/bulk - Import batch de prospects depuis l'extension (résultats de recherche)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospects, source, search_action_id } = body;

    if (!prospects || !Array.isArray(prospects) || prospects.length === 0) {
      return NextResponse.json(
        { error: "Liste de prospects vide ou invalide" },
        { status: 400 }
      );
    }

    const saved: any[] = [];
    const skipped: string[] = [];

    for (const p of prospects) {
      if (!p.name || !p.linkedin_url) {
        skipped.push(p.name || "Inconnu");
        continue;
      }

      try {
        // UPSERT: insérer ou mettre à jour si l'URL existe déjà
        const result = await query(
          `INSERT INTO prospects (linkedin_url, name, role, company, location, status, score, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'new', 50, $6, NOW(), NOW())
           ON CONFLICT (linkedin_url) DO UPDATE SET
             name = COALESCE(EXCLUDED.name, prospects.name),
             role = COALESCE(EXCLUDED.role, prospects.role),
             location = COALESCE(EXCLUDED.location, prospects.location),
             updated_at = NOW()
           RETURNING id, name, linkedin_url, status`,
          [
            p.linkedin_url,
            p.name,
            p.role || null,
            p.company || null,
            p.location || null,
            source ? `Source: ${source}${search_action_id ? ` (action #${search_action_id})` : ""}` : null,
          ]
        );
        saved.push(result.rows[0]);
      } catch (err) {
        console.error(`Failed to save prospect ${p.name}:`, err);
        skipped.push(p.name);
      }
    }

    return NextResponse.json({
      success: true,
      saved_count: saved.length,
      skipped_count: skipped.length,
      prospects: saved,
      skipped,
    });
  } catch (error) {
    console.error("POST /api/prospects/bulk error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'import des prospects", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
