import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { getTokenFromRequest } from "@/lib/auth-cookies";
import { z } from "zod";

const userSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  company: z.string().optional(),
  role: z.string().optional(),
  linkedin_connected: z.boolean().default(false),
  linkedin_email: z.string().email().optional().or(z.literal("")),
  settings: z.record(z.string(), z.unknown()).optional(),
});

// Multi-admin SaaS : JWT obligatoire (admin ET user secondaire)
async function resolveCurrentUser(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.userId) return null;

  const result = await query("SELECT * FROM users WHERE id = $1", [payload.userId]);
  const user = result.rows[0];
  if (!user || user.is_active === false) return null;
  return user;
}

// GET /api/users/me - Récupérer l'utilisateur courant (admin via LinkedIn, user via JWT)
export async function GET(request: NextRequest) {
  try {
    const user = await resolveCurrentUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        role: user.role || "admin",
        linkedin_connected: user.linkedin_connected,
        linkedin_email: user.linkedin_email,
        settings: user.settings,
        admin_id: user.admin_id,
        is_active: user.is_active,
      },
    });
  } catch (error) {
    console.error("GET /api/users/me error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'utilisateur" },
      { status: 500 }
    );
  }
}

// PUT /api/users/me - Mettre à jour le profil courant
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await resolveCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = userSchema.partial().parse(body);

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    Object.entries(validated).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        if (key === "settings") {
          updates.push(`${key} = COALESCE(${key}, '{}'::jsonb) || $${paramCount}::jsonb`);
        } else {
          updates.push(`${key} = $${paramCount}`);
        }
        values.push(key === "settings" ? JSON.stringify(value) : value);
      }
    });

    if (updates.length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(currentUser.id);

    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING *`;
    const result = await query(sql, values);

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("PUT /api/users/me error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.format() },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}
