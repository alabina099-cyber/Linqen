import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";
import { ensureOwnershipColumns, getRequestUser, getScopeUserIds } from "@/lib/requestAuth";

// Schema validation pour mise à jour
const campaignUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  company_size: z.string().optional(),
  target_role: z.string().optional(),
  target: z.string().optional(),
  template: z.string().optional(),
  template_invitation: z.string().optional(),
  template_followup: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
  contacted: z.number().optional(),
  replied: z.number().optional(),
  converted: z.number().optional(),
  connections_sent: z.number().optional(),
  connections_accepted: z.number().optional(),
  objective: z.string().optional(),
  seniority: z.string().optional(),
  campaign_type: z.string().optional(),
  daily_limit: z.number().optional(),
  follow_up_days: z.number().optional(),
});

// Vérifie que le requester peut accéder à la campagne (sinon retourne null)
async function assertAccess(request: NextRequest, campaignId: number) {
  await ensureOwnershipColumns();
  const user = await getRequestUser(request);
  if (!user) return { ok: false as const, status: 401, error: "Non authentifié" };

  const owner = await query("SELECT user_id FROM campaigns WHERE id = $1", [campaignId]);
  if (owner.rows.length === 0) return { ok: false as const, status: 404, error: "Campagne non trouvée" };

  const ownerId: number | null = owner.rows[0].user_id;
  const scopeIds = await getScopeUserIds(user);
  const allowed = ownerId == null ? user.role === "admin" : scopeIds.includes(ownerId);
  if (!allowed) return { ok: false as const, status: 403, error: "Accès refusé" };

  return { ok: true as const, user };
}

// GET /api/campaigns/[id]
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

    const access = await assertAccess(request, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const result = await query(
      `SELECT c.*,
        COALESCE(json_agg(
          json_build_object(
            'id', m.id,
            'prospect_id', m.prospect_id,
            'recipient_name', m.recipient_name,
            'recipient_role', m.recipient_role,
            'recipient_company', m.recipient_company,
            'message_text', m.message_text,
            'status', m.status,
            'message_type', m.message_type,
            'created_at', m.created_at
          ) ORDER BY m.created_at DESC
        ) FILTER (WHERE m.id IS NOT NULL), '[]') as messages
      FROM campaigns c
      LEFT JOIN messages m ON c.id = m.campaign_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Campagne non trouvée" }, { status: 404 });
    }

    return NextResponse.json({ success: true, campaign: result.rows[0] });
  } catch (error) {
    console.error("GET /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la campagne" },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id]
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

    const access = await assertAccess(request, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json();
    const validated = campaignUpdateSchema.parse(body);

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

    const sql = `UPDATE campaigns SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(sql, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Campagne non trouvée" }, { status: 404 });
    }

    return NextResponse.json({ success: true, campaign: result.rows[0] });
  } catch (error) {
    console.error("PUT /api/campaigns/[id] error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la campagne" },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]
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

    const access = await assertAccess(request, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await query("DELETE FROM messages WHERE campaign_id = $1", [id]);
    const result = await query("DELETE FROM campaigns WHERE id = $1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Campagne non trouvée" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Campagne supprimée avec succès" });
  } catch (error) {
    console.error("DELETE /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la campagne" },
      { status: 500 }
    );
  }
}
