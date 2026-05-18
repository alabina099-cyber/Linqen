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
// Met à jour le statut d'un prospect par linkedin_url
// Body: { linkedin_url: string, status: string, prospect_id?: number }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { linkedin_url, status, prospect_id } = body;

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
      // Mise à jour par ID
      result = await query(
        `UPDATE prospects SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, linkedin_url, status`,
        [status, prospect_id]
      );
    } else if (linkedin_url) {
      // Mise à jour par URL LinkedIn — essayer exact d'abord, puis LIKE pour variantes
      const cleanUrl = linkedin_url.replace(/\/+$/, ""); // Enlever trailing slashes
      result = await query(
        `UPDATE prospects SET status = $1, updated_at = NOW() 
         WHERE linkedin_url = $2 OR linkedin_url = $3 OR linkedin_url LIKE $4
         RETURNING id, name, linkedin_url, status`,
        [status, linkedin_url, cleanUrl, `${cleanUrl}%`]
      );
    } else {
      return NextResponse.json(
        { success: false, error: "linkedin_url ou prospect_id requis" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Prospect non trouvé" },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
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
