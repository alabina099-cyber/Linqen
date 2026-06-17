import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyToken, isAdmin, hashPassword } from "@/lib/auth";
import { getTokenFromRequest } from "@/lib/auth-cookies";

// Auto-migration : s'assure que les colonnes auth existent
async function ensureAuthColumns() {
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
}

// Helper : extraire l'admin authentifié (JWT obligatoire, multi-admin SaaS)
async function getAuthenticatedAdmin(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (payload && isAdmin(payload.role)) {
    return payload;
  }
  return null;
}

// GET /api/users/team
// Liste les utilisateurs secondaires créés par l'admin
export async function GET(request: NextRequest) {
  try {
    await ensureAuthColumns();
    const admin = await getAuthenticatedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const result = await query(
      `SELECT id, name, email, company, role, is_active, created_at
       FROM users WHERE admin_id = $1 OR id = $1
       ORDER BY role DESC, created_at DESC`,
      [admin.userId]
    );

    return NextResponse.json({
      success: true,
      team: result.rows,
    });
  } catch (error) {
    console.error("GET /api/users/team error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// POST /api/users/team
// Créer un nouvel utilisateur secondaire (max 10 par admin)
export async function POST(request: NextRequest) {
  try {
    await ensureAuthColumns();
    const admin = await getAuthenticatedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, company } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nom, email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Vérifier la limite de 10 users par admin
    const countResult = await query(
      "SELECT COUNT(*) as count FROM users WHERE admin_id = $1",
      [admin.userId]
    );
    if (parseInt(countResult.rows[0].count) >= 10) {
      return NextResponse.json(
        { error: "Limite de 10 utilisateurs atteinte pour ce compte" },
        { status: 403 }
      );
    }

    // Vérifier si l'email existe déjà
    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    const result = await query(
      `INSERT INTO users (name, email, company, role, admin_id, password_hash, is_active, settings, created_at, updated_at)
       VALUES ($1, $2, $3, 'user', $4, $5, true, '{}', NOW(), NOW())
       RETURNING id, name, email, company, role, is_active, created_at`,
      [name, email, company || null, admin.userId, passwordHash]
    );

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error: any) {
    console.error("POST /api/users/team error:", error);
    const msg = error?.message || "";
    if (msg.includes("password_hash") || msg.includes("admin_id") || msg.includes("is_active")) {
      return NextResponse.json(
        { error: "Migration DB manquante. Veuillez executer 002_add_auth_roles.sql dans Neon DB." },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Erreur lors de la création de l'utilisateur" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/team
// Modifier un utilisateur (activer/désactiver, changer info)
export async function PATCH(request: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, email, company, is_active, password } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID utilisateur requis" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur appartient à l'admin
    const check = await query(
      "SELECT id FROM users WHERE id = $1 AND admin_id = $2",
      [id, admin.userId]
    );
    if (check.rows.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur introuvable ou non autorisé" },
        { status: 404 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      values.push(name);
    }
    if (email !== undefined) {
      paramCount++;
      updates.push(`email = $${paramCount}`);
      values.push(email);
    }
    if (company !== undefined) {
      paramCount++;
      updates.push(`company = $${paramCount}`);
      values.push(company);
    }
    if (is_active !== undefined) {
      paramCount++;
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
    }
    if (password) {
      paramCount++;
      updates.push(`password_hash = $${paramCount}`);
      values.push(hashPassword(password));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Aucune donnée à mettre à jour" },
        { status: 400 }
      );
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING id, name, email, company, role, is_active, created_at`;
    const result = await query(sql, values);

    return NextResponse.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("PATCH /api/users/team error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/team
// Supprimer un utilisateur secondaire
export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID utilisateur requis" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur appartient à l'admin
    const check = await query(
      "SELECT id FROM users WHERE id = $1 AND admin_id = $2",
      [id, admin.userId]
    );
    if (check.rows.length === 0) {
      return NextResponse.json(
        { error: "Utilisateur introuvable ou non autorisé" },
        { status: 404 }
      );
    }

    await query("DELETE FROM users WHERE id = $1", [id]);

    return NextResponse.json({
      success: true,
      message: "Utilisateur supprimé",
    });
  } catch (error) {
    console.error("DELETE /api/users/team error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}
