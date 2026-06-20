import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getTokenFromRequest } from "@/lib/auth-cookies";
import { query } from "@/lib/db";

// =============================================================
// GET /api/auth/me — Architecture multi-admin SaaS
// -------------------------------------------------------------
// JWT obligatoire pour TOUS les rôles (admin ET user secondaire).
// Le JWT est généré côté serveur :
//   - admin : via POST /api/linkedin-auth (cookie LinkedIn -> JWT)
//   - user  : via POST /api/auth/login (email + mdp -> JWT)
// =============================================================
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    const userResult = await query(
      `SELECT id, name, email, role, admin_id, is_active,
              linkedin_email, linkedin_connected
         FROM users
        WHERE id = $1`,
      [payload.userId]
    );
    const u = userResult.rows[0];
    if (!u || u.is_active === false) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: u.id,
        name: u.name,
        email: u.email || u.linkedin_email,
        role: u.role,
        adminId: u.admin_id,
        linkedinEmail: u.linkedin_email,
        linkedinConnected: u.linkedin_connected,
      },
      token, // Transmis à l'extension Chrome (bridge) après login OAuth
    });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ success: false, user: null }, { status: 500 });
  }
}
