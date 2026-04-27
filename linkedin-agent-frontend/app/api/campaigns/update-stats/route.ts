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

// POST /api/campaigns/update-stats — Mettre à jour les stats d'une campagne quand un prospect répond/convertit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prospect_id, stat, campaign_id } = body;

    if (!stat || !['replied', 'clicked', 'converted'].includes(stat)) {
      return NextResponse.json(
        { error: "stat doit être 'replied', 'clicked' ou 'converted'" },
        { status: 400 }
      );
    }

    const updatedCampaigns: number[] = [];

    if (campaign_id) {
      // Mise à jour directe si le campaign_id est fourni
      await query(
        `UPDATE campaigns SET ${stat} = ${stat} + 1, updated_at = NOW() WHERE id = $1`,
        [campaign_id]
      );
      updatedCampaigns.push(campaign_id);
    } else if (prospect_id) {
      // Trouver les campagnes liées au prospect via la table messages
      const campaignsResult = await query(
        `SELECT DISTINCT campaign_id FROM messages 
         WHERE prospect_id = $1 AND campaign_id IS NOT NULL`,
        [prospect_id]
      );

      for (const row of campaignsResult.rows) {
        await query(
          `UPDATE campaigns SET ${stat} = ${stat} + 1, updated_at = NOW() WHERE id = $1`,
          [row.campaign_id]
        );
        updatedCampaigns.push(row.campaign_id);
      }
    } else {
      return NextResponse.json(
        { error: "prospect_id ou campaign_id requis" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      updated_campaigns: updatedCampaigns,
      stat,
    }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("POST /api/campaigns/update-stats error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour des stats" },
      { status: 500 }
    );
  }
}
