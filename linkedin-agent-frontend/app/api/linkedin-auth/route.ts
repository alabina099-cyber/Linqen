import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { encrypt } from "@/lib/security";
import { createToken, verifyToken } from "@/lib/auth";
import {
  setAuthCookie,
  clearAuthCookie,
  getTokenFromRequest,
} from "@/lib/auth-cookies";
import { checkAuthRateLimit, getClientIp } from "@/lib/auth-rate-limit";

// =============================================================
// /api/linkedin-auth — Multi-Admin SaaS
// -------------------------------------------------------------
//  POST   : un visiteur se connecte (ou se ré-authentifie) avec
//           son cookie LinkedIn -> on identifie / crée l'admin
//           correspondant et on renvoie un JWT propre à cet admin.
//
//  GET    : retourne le statut LinkedIn de l'admin courant
//           (résolu via JWT Bearer). Sans JWT -> connected=false.
//
//  DELETE : déconnecte UNIQUEMENT l'admin courant (JWT requis),
//           sans toucher aux autres admins de la plateforme.
// =============================================================

// ---- Schéma léger d'auto-migration ----
// Idempotent : sécurise les colonnes nécessaires si la migration
// 003_multi_admin_saas.sql n'a pas encore été appliquée.
async function ensureSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_email TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_connected BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_session_cookie TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_auth_method VARCHAR(32)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_connected_at TIMESTAMP`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT`);
  // Supprimer le verrou mono-admin hérité de l'ancienne architecture
  await pool.query(`DROP INDEX IF EXISTS idx_users_single_admin`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_linkedin_email ON users(linkedin_email)`);
}

// ---- Helper : extraire l'admin courant depuis le JWT ----
// Lit en priorité le cookie HttpOnly, fallback sur le header Bearer
// (compat extension Chrome).
async function getCurrentAdminId(request: NextRequest): Promise<number | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload?.userId || payload.role !== "admin") return null;
  return payload.userId;
}

// =============================================================
// OPTIONS — CORS preflight
// =============================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

// =============================================================
// GET — statut LinkedIn de l'admin courant
// =============================================================
export async function GET(request: NextRequest) {
  try {
    await ensureSchema();

    const adminId = await getCurrentAdminId(request);
    if (!adminId) {
      return NextResponse.json({
        connected: false,
        email: null,
        name: null,
        auth_method: null,
        connected_at: null,
      });
    }

    const r = await pool.query(
      `SELECT id, name, linkedin_email, linkedin_connected, linkedin_auth_method, linkedin_connected_at,
              CASE WHEN linkedin_session_cookie IS NOT NULL AND linkedin_session_cookie <> '' THEN true ELSE false END AS has_cookie
         FROM users
        WHERE id = $1 AND role = 'admin'`,
      [adminId]
    );
    const admin = r.rows[0];
    if (!admin) {
      return NextResponse.json({ connected: false, email: null, name: null, auth_method: null });
    }

    const isConnected = !!admin.linkedin_connected && !!admin.has_cookie;

    return NextResponse.json({
      connected: isConnected,
      email: admin.linkedin_email || null,
      name: admin.name || null,
      auth_method: admin.linkedin_auth_method || null,
      connected_at: admin.linkedin_connected_at || null,
    });
  } catch (error) {
    console.error("GET /api/linkedin-auth error:", error);
    return NextResponse.json({ connected: false, email: null, name: null, auth_method: null });
  }
}

// =============================================================
// POST — connexion LinkedIn -> crée/met à jour l'admin + JWT
// =============================================================
export async function POST(req: NextRequest) {
  try {
    // Rate limit anti brute-force (5 / 10min par IP)
    const ip = getClientIp(req);
    const rl = checkAuthRateLimit(`linkedin-auth:${ip}`, 5, 10 * 60 * 1000);
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

    const body = await req.json();
    const {
      method,
      cookie,
      email,
      name,
      profileUrl,
    }: {
      method?: string;
      cookie?: string;
      email?: string;
      name?: string;
      profileUrl?: string;
    } = body || {};

    if (!method || !["cookie", "extension", "oauth"].includes(method)) {
      return NextResponse.json(
        { error: "Méthode invalide. Utilisez 'cookie' ou 'extension'." },
        { status: 400 }
      );
    }
    if ((method === "cookie" || method === "extension") && !cookie) {
      return NextResponse.json(
        { error: "Cookie li_at requis." },
        { status: 400 }
      );
    }
    await ensureSchema();

    // ----------------------------------------------------------
    // Identification de l'admin — priorité au JWT de la session.
    //
    //  Si l'admin est DÉJÀ connecté (cookie HttpOnly ou Bearer),
    //  on attache la session LinkedIn à CE compte précis, quel que
    //  soit le mode de connexion initial (email/mot de passe OU
    //  LinkedIn). Ainsi les deux méthodes restent sur le MÊME compte
    //  et aucun doublon n'est créé. L'email devient alors optionnel.
    //
    //  Sans JWT (ex: extension avant login, premier rattachement),
    //  on retombe sur l'identification par email (obligatoire).
    // ----------------------------------------------------------
    const currentAdminId = await getCurrentAdminId(req);

    // Email obligatoire UNIQUEMENT en l'absence de session admin.
    if (!currentAdminId && (!email || !email.includes("@"))) {
      return NextResponse.json(
        {
          error:
            "Email LinkedIn requis pour identifier l'admin de manière unique.",
        },
        { status: 400 }
      );
    }

    // Cookie chiffré avant stockage (AES-256-GCM)
    const encryptedCookie = cookie ? encrypt(cookie.trim()) : null;
    const adminName = name?.trim() || (email ? email.split("@")[0] : "Admin LinkedIn");
    const adminEmail = email?.trim() || `linkedin-${Date.now()}@local`;

    // ----------------------------------------------------------
    // Stratégie d'identification de l'admin :
    //  0. Session JWT admin courante -> on cible directement ce compte
    //  1. Sinon match strict sur linkedin_email (priorité) ou email
    //  2. Si trouvé en tant qu'admin -> on met à jour son cookie
    //  3. Si trouvé en tant qu'user secondaire -> conflit (refus)
    //  4. Sinon -> on crée un nouvel admin
    // ----------------------------------------------------------
    const lookupEmail = email?.trim();
    let existing: { id: number; role: string } | null = null;

    if (currentAdminId) {
      // L'admin est authentifié : on rattache LinkedIn à son compte.
      existing = { id: currentAdminId, role: "admin" };
    } else if (lookupEmail) {
      const r = await pool.query(
        `SELECT id, role FROM users
          WHERE LOWER(linkedin_email) = LOWER($1) OR LOWER(email) = LOWER($1)
          ORDER BY (role = 'admin') DESC, id ASC
          LIMIT 1`,
        [lookupEmail]
      );
      existing = r.rows[0] || null;
    }

    if (existing && existing.role !== "admin") {
      return NextResponse.json(
        {
          error:
            "Cet email est déjà utilisé par un membre d'équipe. Demandez à votre admin de vous connecter via vos identifiants email/mot de passe.",
        },
        { status: 409 }
      );
    }

    let adminId: number;
    if (existing && existing.role === "admin") {
      // Mise à jour du cookie/profil de cet admin
      await pool.query(
        `UPDATE users SET
           name = COALESCE($1, name),
           email = COALESCE($2, email),
           linkedin_email = COALESCE($3, linkedin_email),
           linkedin_connected = true,
           linkedin_session_cookie = $4,
           linkedin_auth_method = $5,
           linkedin_connected_at = NOW(),
           linkedin_profile_url = COALESCE($6, linkedin_profile_url),
           is_active = true,
           updated_at = NOW()
         WHERE id = $7`,
        [
          name || null,
          // Admin authentifié : on NE réécrit PAS son email de login
          // (sinon la connexion email/mot de passe casserait si l'email
          //  LinkedIn diffère). On met seulement à jour linkedin_email.
          currentAdminId ? null : email || null,
          email || null,
          encryptedCookie,
          method,
          profileUrl || null,
          existing.id,
        ]
      );
      adminId = existing.id;
    } else {
      // Création d'un nouvel admin
      const insert = await pool.query(
        `INSERT INTO users (
           name, email, role, admin_id,
           linkedin_connected, linkedin_email, linkedin_session_cookie,
           linkedin_auth_method, linkedin_connected_at, linkedin_profile_url,
           is_active, settings, created_at, updated_at
         )
         VALUES ($1, $2, 'admin', NULL, true, $3, $4, $5, NOW(), $6, true, '{}', NOW(), NOW())
         RETURNING id`,
        [
          adminName,
          adminEmail,
          email || null,
          encryptedCookie,
          method,
          profileUrl || null,
        ]
      );
      adminId = insert.rows[0].id;
    }

    // Rafraîchir les infos de l'admin (utiles pour la réponse + JWT)
    const admin = (
      await pool.query(
        `SELECT id, name, email, role, linkedin_email FROM users WHERE id = $1`,
        [adminId]
      )
    ).rows[0];

    // Génération du JWT (7 jours)
    const token = await createToken({
      userId: admin.id,
      email: admin.email,
      role: "admin",
      adminId: null,
      name: admin.name,
    });

    const res = NextResponse.json({
      success: true,
      message: `Compte LinkedIn connecté via ${method}.`,
      method,
      token, // pour l'extension Chrome uniquement
      user: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: "admin",
        linkedinEmail: admin.linkedin_email,
        linkedinConnected: true,
      },
    });
    setAuthCookie(res, token);
    return res;
  } catch (error) {
    console.error("POST /api/linkedin-auth error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde des credentials." },
      { status: 500 }
    );
  }
}

// =============================================================
// DELETE — déconnexion de l'admin courant (JWT requis)
// =============================================================
export async function DELETE(request: NextRequest) {
  try {
    const adminId = await getCurrentAdminId(request);
    if (!adminId) {
      const res = NextResponse.json({
        success: true,
        message: "Aucune session admin active.",
      });
      clearAuthCookie(res);
      return res;
    }

    await pool.query(
      `UPDATE users SET
         linkedin_connected = false,
         linkedin_session_cookie = NULL,
         linkedin_auth_method = NULL,
         linkedin_connected_at = NULL,
         updated_at = NOW()
       WHERE id = $1`,
      [adminId]
    );

    const res = NextResponse.json({
      success: true,
      message: "Compte LinkedIn déconnecté.",
    });
    clearAuthCookie(res);
    return res;
  } catch (error) {
    console.error("DELETE /api/linkedin-auth error:", error);
    return NextResponse.json({ error: "Erreur lors de la déconnexion." }, { status: 500 });
  }
}
