import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/auth/me
// Retourne l'utilisateur courant selon le token JWT (pour users secondaires)
// OU selon le cookie LinkedIn (pour admins)
export async function GET(request: NextRequest) {
  try {
    // 1. Essayer le token JWT d'abord (users secondaires)
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = await verifyToken(token);
      if (payload) {
        const userResult = await query(
          `SELECT id, name, email, role, admin_id, is_active FROM users WHERE id = $1`,
          [payload.userId]
        );
        if (userResult.rows.length > 0 && userResult.rows[0].is_active) {
          return NextResponse.json({
            success: true,
            user: {
              id: userResult.rows[0].id,
              name: userResult.rows[0].name,
              email: userResult.rows[0].email,
              role: userResult.rows[0].role,
              adminId: userResult.rows[0].admin_id,
            },
          });
        }
      }
    }

    // 2. Fallback : essayer LinkedIn auth (admins)
    const result = await query(
      `SELECT u.id, u.name, u.email, u.role, u.linkedin_email, u.linkedin_connected
       FROM users u
       JOIN app_settings s ON s.key = 'linkedin_session_cookie'
       WHERE u.role = 'admin'
       LIMIT 1`
    );

    if (result.rows.length > 0) {
      const admin = result.rows[0];
      return NextResponse.json({
        success: true,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email || admin.linkedin_email,
          role: "admin",
          linkedinConnected: admin.linkedin_connected,
        },
      });
    }

    // 3. Fallback legacy : premier utilisateur sans distinction
    const legacy = await query("SELECT * FROM users LIMIT 1");
    if (legacy.rows.length > 0) {
      return NextResponse.json({
        success: true,
        user: { ...legacy.rows[0], role: legacy.rows[0].role || "admin" },
      });
    }

    return NextResponse.json(
      { success: false, user: null },
      { status: 401 }
    );
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { success: false, user: null },
      { status: 500 }
    );
  }
}
