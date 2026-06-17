import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, createToken } from "@/lib/auth";
import { setAuthCookie } from "@/lib/auth-cookies";
import {
  checkAuthRateLimit,
  resetAuthRateLimit,
  getClientIp,
} from "@/lib/auth-rate-limit";

// =============================================================
// POST /api/auth/login
// -------------------------------------------------------------
// Login email + mot de passe pour :
//   - les ADMINS (mdp défini via Settings après OAuth LinkedIn)
//   - les USERS secondaires (créés par l'admin)
//
// Sécurité :
//   - Rate limit : 5 tentatives / 10 min par IP+email (anti brute-force).
//   - JWT en cookie HttpOnly + Secure + SameSite=Lax (anti-XSS).
//   - Le token est AUSSI renvoyé dans le body uniquement pour la
//     compat de l'extension Chrome (header Bearer). Le navigateur
//     ne le stocke plus en localStorage.
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const rlKey = `login:${ip}:${email.toLowerCase()}`;
    const rl = checkAuthRateLimit(rlKey, 5, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        {
          error: `Trop de tentatives. Réessayez dans ${Math.ceil(
            (rl.retryAfter ?? 60) / 60
          )} minute(s).`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rl.retryAfter ?? 60) },
        }
      );
    }

    // Admin OU user secondaire
    const result = await query(
      `SELECT id, name, email, role, admin_id, password_hash, is_active
       FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }
    const user = result.rows[0];
    if (!user.is_active) {
      return NextResponse.json(
        { error: "Ce compte a été désactivé" },
        { status: 403 }
      );
    }
    if (!user.password_hash || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    resetAuthRateLimit(rlKey);

    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      adminId: user.admin_id,
      name: user.name,
    });

    const res = NextResponse.json({
      success: true,
      token, // pour l'extension Chrome uniquement
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        adminId: user.admin_id,
      },
    });
    setAuthCookie(res, token);
    return res;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    );
  }
}
