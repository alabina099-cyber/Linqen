// =============================================
// Request Auth & Data Scoping
// Résout l'utilisateur courant (JWT secondaire OU session LinkedIn admin)
// et fournit le périmètre de données (user_id) qu'il peut voir/modifier.
// =============================================

import { NextRequest } from "next/server";
import { query } from "./db";
import { verifyToken } from "./auth";
import { getTokenFromRequest } from "./auth-cookies";

export interface RequestUser {
  userId: number;
  role: "admin" | "user";
  adminId: number | null;
  name: string;
}

// ---------------------------------------------
// Auto-migration : colonnes de propriété user_id
// Idempotent — peut être appelé à chaque requête.
// ---------------------------------------------
let ownershipReady = false;
export async function ensureOwnershipColumns(): Promise<void> {
  if (ownershipReady) return;
  try {
    await query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE prospects ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE messages  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE agent_chat_history ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await query(`ALTER TABLE linkedin_actions_queue ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await query(`CREATE INDEX IF NOT EXISTS idx_actions_user ON linkedin_actions_queue(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_campaigns_user ON campaigns(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_prospects_user ON prospects(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_messages_user  ON messages(user_id)`);
    ownershipReady = true;
  } catch (e) {
    // Non-fatal : on log mais on ne bloque pas la requête
    console.error("ensureOwnershipColumns error (non-fatal):", e);
  }
}

// ---------------------------------------------
// Résout l'utilisateur courant à partir de la requête.
// Architecture multi-admin SaaS : JWT obligatoire pour TOUS les rôles
// (admin OU user secondaire). Plus de fallback "premier admin".
// ---------------------------------------------
export async function getRequestUser(request: NextRequest): Promise<RequestUser | null> {
  // Cookie HttpOnly (navigateur) OU header Bearer (extension Chrome)
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return null;

  // Vérifier que le compte est toujours actif et récupérer le rôle/admin_id
  // à jour depuis la base (ne pas se fier uniquement au contenu du JWT).
  const check = await query(
    `SELECT id, name, role, admin_id, is_active FROM users WHERE id = $1`,
    [payload.userId]
  );
  const row = check.rows[0];
  if (!row || row.is_active === false) return null;

  return {
    userId: row.id,
    role: row.role === "admin" ? "admin" : "user",
    adminId: row.admin_id ?? null,
    name: row.name,
  };
}

// ---------------------------------------------
// Liste des user_id que le requester peut VOIR.
// - user  -> uniquement lui-même
// - admin -> lui-même + tous ses membres d'équipe
// ---------------------------------------------
export async function getScopeUserIds(user: RequestUser): Promise<number[]> {
  if (user.role === "admin") {
    const r = await query(
      `SELECT id FROM users WHERE id = $1 OR admin_id = $1`,
      [user.userId]
    );
    return r.rows.map((row) => row.id as number);
  }
  return [user.userId];
}

// ---------------------------------------------
// Construit une clause WHERE de scope sur une colonne user_id.
// Retourne { clause, params } à insérer dans une requête SQL.
// startIndex = numéro du premier placeholder ($N).
//
// - admin : (col = ANY($N) OR col IS NULL)   (inclut les données legacy)
// - user  : col = $N                         (strict)
// ---------------------------------------------
export async function buildScopeClause(
  user: RequestUser,
  column: string,
  startIndex: number
): Promise<{ clause: string; params: any[]; nextIndex: number }> {
  if (user.role === "admin") {
    const ids = await getScopeUserIds(user);
    return {
      clause: `(${column} = ANY($${startIndex}) OR ${column} IS NULL)`,
      params: [ids],
      nextIndex: startIndex + 1,
    };
  }
  return {
    clause: `${column} = $${startIndex}`,
    params: [user.userId],
    nextIndex: startIndex + 1,
  };
}
