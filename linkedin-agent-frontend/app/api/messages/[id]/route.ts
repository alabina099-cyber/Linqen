import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";

// Schema validation pour mise à jour
const messageUpdateSchema = z.object({
  message_text: z.string().min(1).optional(),
  status: z.enum(["pending", "sent", "delivered", "read", "replied", "clicked", "converted", "bounced", "failed"]).optional(),
});

// GET /api/messages/[id] - Récupérer un message
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
      `SELECT m.*,
        p.name as prospect_name,
        p.role as prospect_role,
        p.company as prospect_company,
        c.name as campaign_name
      FROM messages m
      LEFT JOIN prospects p ON m.prospect_id = p.id
      LEFT JOIN campaigns c ON m.campaign_id = c.id
      WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Message non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: result.rows[0],
    });
  } catch (error) {
    console.error("GET /api/messages/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du message" },
      { status: 500 }
    );
  }
}

// PUT /api/messages/[id] - Mettre à jour un message (changer status principalement)
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
    const validated = messageUpdateSchema.parse(body);

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
    values.push(id);

    const sql = `UPDATE messages SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Message non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: result.rows[0],
    });
  } catch (error) {
    console.error("PUT /api/messages/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du message" },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/[id] - Supprimer un message
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

    const result = await query(
      "DELETE FROM messages WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Message non trouvé" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Message supprimé avec succès",
    });
  } catch (error) {
    console.error("DELETE /api/messages/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du message" },
      { status: 500 }
    );
  }
}
