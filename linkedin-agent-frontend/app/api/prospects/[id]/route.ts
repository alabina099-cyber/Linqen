import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { z } from "zod";
import { ensureOwnershipColumns, getRequestUser, getScopeUserIds } from "@/lib/requestAuth";

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

// Vérifie que le requester peut accéder au prospect
async function assertAccess(request: NextRequest, prospectId: number) {
  await ensureOwnershipColumns();
  const user = await getRequestUser(request);
  if (!user) return { ok: false as const, status: 401, error: "Non authentifié" };

  const owner = await query("SELECT user_id FROM prospects WHERE id = $1", [prospectId]);
  if (owner.rows.length === 0) return { ok: false as const, status: 404, error: "Prospect non trouvé" };

  const ownerId: number | null = owner.rows[0].user_id;
  const scopeIds = await getScopeUserIds(user);
  const allowed = ownerId == null ? user.role === "admin" : scopeIds.includes(ownerId);
  if (!allowed) return { ok: false as const, status: 403, error: "Accès refusé" };

  return { ok: true as const, user };
}

// GET /api/prospects/[id]
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

    return NextResponse.json({ success: true, prospect: result.rows[0] });
  } catch (error) {
    console.error("GET /api/prospects/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération du prospect" },
      { status: 500 }
    );
  }
}

// PUT /api/prospects/[id]
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

    return NextResponse.json({ success: true, prospect: result.rows[0] });
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

    const access = await assertAccess(request, id);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
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

    return NextResponse.json({ success: true, prospect: result.rows[0] });
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

// DELETE /api/prospects/[id]
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

    // Cleanup dependent rows. Each is wrapped so a missing aux table can't abort the main delete.
    const safeCleanup = async (label: string, sql: string) => {
      try {
        await query(sql, [id]);
      } catch (e: any) {
        const msg = e?.message || String(e);
        // Ignore "relation does not exist" for legacy DBs without these tables
        if (!/does not exist/i.test(msg)) {
          console.error(`prospect delete cleanup '${label}' failed:`, msg);
        }
      }
    };
    await safeCleanup("messages", "DELETE FROM messages WHERE prospect_id = $1");
    await safeCleanup("actions_queue", "UPDATE linkedin_actions_queue SET prospect_id = NULL WHERE prospect_id = $1");
    await safeCleanup("scheduled_followups", "DELETE FROM scheduled_followups WHERE prospect_id = $1");
    const result = await query("DELETE FROM prospects WHERE id = $1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Prospect non trouvé" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Prospect supprimé avec succès" });
  } catch (error) {
    console.error("DELETE /api/prospects/[id] error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression du prospect", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
