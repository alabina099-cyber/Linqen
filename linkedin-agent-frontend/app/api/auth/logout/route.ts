import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth-cookies";

// =============================================================
// POST /api/auth/logout
// -------------------------------------------------------------
// Supprime le cookie HttpOnly d'authentification.
// =============================================================
export async function POST() {
  const res = NextResponse.json({ success: true });
  clearAuthCookie(res);
  return res;
}
