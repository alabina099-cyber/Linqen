import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, createToken } from "@/lib/auth";

// POST /api/auth/login
// Login pour les utilisateurs secondaires (email + password)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Rechercher l'utilisateur par email
    const result = await query(
      `SELECT id, name, email, role, admin_id, password_hash, is_active
       FROM users WHERE email = $1 AND role = 'user'`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Vérifier que le compte est actif
    if (!user.is_active) {
      return NextResponse.json(
        { error: "Ce compte a été désactivé" },
        { status: 403 }
      );
    }

    // Vérifier le mot de passe
    if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Créer le token JWT
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      adminId: user.admin_id,
      name: user.name,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        adminId: user.admin_id,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    );
  }
}
