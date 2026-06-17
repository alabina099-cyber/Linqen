import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { verifyToken, hashPassword, verifyPassword } from "@/lib/auth";
import { getTokenFromRequest } from "@/lib/auth-cookies";

// =============================================================
// POST /api/auth/change-password
// -------------------------------------------------------------
// Multi-admin SaaS — Permet à l'utilisateur courant (admin OU
// user secondaire) de changer son mot de passe.
//
// Règles :
//   - JWT obligatoire (identifie l'utilisateur qui change son mdp)
//   - Si un mot de passe est déjà défini : currentPassword requis
//     et doit matcher.
//   - Si aucun mot de passe défini (premier changement pour un admin
//     qui ne s'est connecté que via LinkedIn) : currentPassword est
//     optionnel.
//   - newPassword : 8 caractères min.
// =============================================================

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
});

export async function POST(request: NextRequest) {
  try {
    // 1. JWT obligatoire (cookie HttpOnly OU header Bearer pour l'extension)
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // 2. Validation du body
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.format() },
        { status: 400 }
      );
    }
    const { currentPassword, newPassword } = parsed.data;

    // 3. Récupérer le user et vérifier l'ancien mdp si défini
    const userResult = await query(
      `SELECT id, password_hash, is_active FROM users WHERE id = $1`,
      [payload.userId]
    );
    const user = userResult.rows[0];
    if (!user || user.is_active === false) {
      return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
    }

    if (user.password_hash) {
      // Un mdp existe -> vérifier l'ancien
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Mot de passe actuel requis" },
          { status: 400 }
        );
      }
      if (!verifyPassword(currentPassword, user.password_hash)) {
        return NextResponse.json(
          { error: "Mot de passe actuel incorrect" },
          { status: 400 }
        );
      }
    }
    // Sinon (admin qui n'avait jamais de mdp) : on autorise la création

    // 4. Hasher et sauvegarder le nouveau mdp
    const newHash = hashPassword(newPassword);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newHash, payload.userId]
    );

    return NextResponse.json({
      success: true,
      message: "Mot de passe mis à jour avec succès",
    });
  } catch (error) {
    console.error("POST /api/auth/change-password error:", error);
    return NextResponse.json(
      { error: "Erreur lors du changement de mot de passe" },
      { status: 500 }
    );
  }
}
