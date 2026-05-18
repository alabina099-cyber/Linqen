import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";

// Schema validation pour mise à jour partielle
const prospectUpdateSchema = z.object({
  linkedin_url: z.string().optional(),
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  company_size: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  status: z.enum(["identified", "connected", "contacted", "responded", "interested", "converted"]).optional(),
  score: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// GET /api/prospects/[id] - Récupérer un prospect
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const result = await query(
      `SELECT p.*, 
        COALESCE(json_agg(
          json_build_object(
            'id', m.id,
            'message_text', m.message_text,
            'status', m.status,
            'created_at', m.created_at,
            'campaign_id', m.campaign_id
          ) ORDER BY m.created_at DESC
        ) FILTER (WHERE m.id IS NOT NULL), '[]') as messages
      FROM prospects p
      LEFT JOIN messages m ON p.id = m.prospect_id
      WHERE p.id = $1
      GROUP BY p.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Prospect non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      prospect: result.rows[0],
    });
  } catch (error) {
    console.error("GET /api/prospects/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du prospect" },
      { status: 500 }
    );
  }
}

// PUT /api/prospects/[id] - Mettre à jour un prospect
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const body = await request.json();
    const validated = prospectUpdateSchema.parse(body);

    // Construire la requête UPDATE dynamique
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE prospects SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Prospect non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      prospect: result.rows[0],
    });
  } catch (error) {
    console.error("PUT /api/prospects/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du prospect" },
      { status: 500 }
    );
  }
}

// PATCH /api/prospects/[id] - Mise à jour partielle (drag-and-drop status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    const body = await request.json();
    const validated = prospectUpdateSchema.parse(body);

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE prospects SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Prospect non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      prospect: result.rows[0],
    });
  } catch (error) {
    console.error("PATCH /api/prospects/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du prospect" },
      { status: 500 }
    );
  }
}

// DELETE /api/prospects/[id] - Supprimer un prospect
// Force recompile: 2026-03-13
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Supprimer d'abord les messages associés
    await query("DELETE FROM messages WHERE prospect_id = $1", [id]);

    // Supprimer le prospect
    const result = await query(
      "DELETE FROM prospects WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Prospect non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Prospect supprimé avec succès",
    });
  } catch (error) {
    console.error("DELETE /api/prospects/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du prospect", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
