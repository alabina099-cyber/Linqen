import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// POST /api/prospects/update-status
// Met à jour OU crée (UPSERT) un prospect par linkedin_url avec un statut donné
// Body: { linkedin_url: string, status: string, prospect_id?: number, name?: string, role?: string, company?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { linkedin_url, status, prospect_id, name, role, company, industry, location } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: "status est requis" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const validStatuses = ["identified", "connected", "contacted", "responded", "interested", "converted"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Status invalide: ${status}. Valeurs acceptées: ${validStatuses.join(", ")}` },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    let result;

    if (prospect_id) {
      // Mise à jour par ID (le prospect doit exister)
      result = await query(
        `UPDATE prospects SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, linkedin_url, status`,
        [status, prospect_id]
      );
      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Prospect non trouvé (ID introuvable)" },
          { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }
    } else if (linkedin_url) {
      // Validation: doit être une vraie URL LinkedIn (anti-XSS / anti-injection)
      const linkedInUrlRegex = /^https?:\/\/(www\.)?linkedin\.com\/[a-zA-Z0-9\-_/?&=%.]+$/i;
      if (!linkedInUrlRegex.test(linkedin_url)) {
        return NextResponse.json(
          { success: false, error: "linkedin_url invalide : doit être une URL LinkedIn valide" },
          { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
        );
      }

      // UPSERT par URL LinkedIn : crée le prospect s'il n'existe pas
      const cleanUrl = linkedin_url.replace(/\/+$/, "");
      result = await query(
        `INSERT INTO prospects (linkedin_url, name, role, company, industry, location, status, score, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 50, NOW(), NOW())
         ON CONFLICT (linkedin_url) DO UPDATE SET
           status = EXCLUDED.status,
           name = COALESCE(EXCLUDED.name, prospects.name),
           role = COALESCE(EXCLUDED.role, prospects.role),
           company = COALESCE(EXCLUDED.company, prospects.company),
           industry = COALESCE(EXCLUDED.industry, prospects.industry),
           location = COALESCE(EXCLUDED.location, prospects.location),
           updated_at = NOW()
         RETURNING id, name, linkedin_url, status`,
        [cleanUrl, name || null, role || null, company || null, industry || null, location || null, status]
      );
    } else {
      return NextResponse.json(
        { success: false, error: "linkedin_url ou prospect_id requis" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    return NextResponse.json({
      success: true,
      prospect: result.rows[0],
    }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("POST /api/prospects/update-status error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la mise à jour", details: error instanceof Error ? error.message : String(error) },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
