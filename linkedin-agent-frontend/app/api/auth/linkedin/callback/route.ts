import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { createToken } from "@/lib/auth";
import {
  setAuthCookie,
  clearOAuthStateCookie,
  OAUTH_STATE_COOKIE,
} from "@/lib/auth-cookies";

// =============================================================
// GET /api/auth/linkedin/callback
// -------------------------------------------------------------
// Callback OAuth 2.0 LinkedIn (Sign In with LinkedIn v2 / OpenID).
//   1. Vérifie le `state` (anti-CSRF) contre le cookie HttpOnly.
//   2. Échange le `code` contre un `access_token`.
//   3. Récupère le profil OpenID (sub, email, name, picture).
//   4. Upsert l'admin dans la table `users` (clé = email LinkedIn).
//   5. Génère un JWT et le stocke en cookie HttpOnly (anti-XSS).
//   6. Redirige vers `/`.
// =============================================================

/**
 * Origine publique canonique de l'app, dérivée de LINKEDIN_REDIRECT_URI.
 * Derrière le proxy Coolify, `request.url` peut valoir `http://0.0.0.0:3000/...`
 * (adresse interne du container), donc on ne peut pas s'en servir pour rediriger
 * le navigateur. On reconstruit depuis l'URL de callback connue côté serveur.
 */
function getPublicOrigin(request: NextRequest): string {
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (redirectUri) {
    try {
      return new URL(redirectUri).origin;
    } catch {
      // fallthrough
    }
  }
  return new URL(request.url).origin;
}

const loginErrorRedirect = (request: NextRequest, msg: string) =>
  NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent(msg)}`,
      getPublicOrigin(request)
    )
  );

async function ensureSchema(): Promise<void> {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_email TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_connected BOOLEAN DEFAULT FALSE`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_auth_method VARCHAR(32)`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_connected_at TIMESTAMP`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_profile_url TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_sub TEXT`);
  await pool.query(`DROP INDEX IF EXISTS idx_users_single_admin`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_linkedin_email ON users(linkedin_email)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_linkedin_sub ON users(linkedin_sub)`);
}

interface LinkedInProfile {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const oauthErrorDesc = url.searchParams.get("error_description");
  const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // 0. Erreur retournée par LinkedIn (refus, etc.)
  if (oauthError) {
    const res = loginErrorRedirect(
      request,
      `LinkedIn a refusé l'authentification : ${oauthErrorDesc || oauthError}`
    );
    clearOAuthStateCookie(res);
    return res;
  }

  // 1. Anti-CSRF : state doit correspondre au cookie
  if (!code || !state || !stateCookie || state !== stateCookie) {
    const res = loginErrorRedirect(request, "State OAuth invalide ou expiré.");
    clearOAuthStateCookie(res);
    return res;
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return loginErrorRedirect(
      request,
      "OAuth LinkedIn non configuré côté serveur."
    );
  }

  try {
    // 2. Échange code -> access_token
    const tokenRes = await fetch(
      "https://www.linkedin.com/oauth/v2/accessToken",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );
    if (!tokenRes.ok) {
      const detail = await tokenRes.text().catch(() => "");
      console.error(
        "[linkedin/callback] token exchange failed:",
        tokenRes.status,
        detail
      );
      return loginErrorRedirect(
        request,
        `Échec de l'échange du code OAuth (HTTP ${tokenRes.status}).`
      );
    }
    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return loginErrorRedirect(request, "Access token LinkedIn introuvable.");
    }

    // 3. Récupération du profil OpenID
    const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      console.error(
        "[linkedin/callback] userinfo failed:",
        profileRes.status,
        await profileRes.text().catch(() => "")
      );
      return loginErrorRedirect(
        request,
        "Impossible de récupérer le profil LinkedIn."
      );
    }
    const profile = (await profileRes.json()) as LinkedInProfile;

    if (!profile.sub) {
      return loginErrorRedirect(request, "Profil LinkedIn invalide.");
    }
    const email =
      profile.email?.trim() || `linkedin-${profile.sub}@noemail.local`;
    const name =
      profile.name?.trim() ||
      [profile.given_name, profile.family_name].filter(Boolean).join(" ") ||
      email.split("@")[0];

    await ensureSchema();

    // 4. Upsert admin (clé : linkedin_sub > linkedin_email > email)
    //    - sub : identifiant LinkedIn stable, prioritaire
    //    - sinon : on tombe sur l'email
    const existingRes = await pool.query(
      `SELECT id, role FROM users
        WHERE linkedin_sub = $1
           OR LOWER(linkedin_email) = LOWER($2)
           OR LOWER(email) = LOWER($2)
        ORDER BY (role = 'admin') DESC, id ASC
        LIMIT 1`,
      [profile.sub, email]
    );
    const existing = existingRes.rows[0] as
      | { id: number; role: string }
      | undefined;

    if (existing && existing.role !== "admin") {
      // L'email correspond à un membre d'équipe -> conflit
      const res = loginErrorRedirect(
        request,
        "Cet email LinkedIn est déjà utilisé par un membre d'équipe."
      );
      clearOAuthStateCookie(res);
      return res;
    }

    let adminId: number;
    if (existing && existing.role === "admin") {
      await pool.query(
        `UPDATE users SET
           name = COALESCE($1, name),
           email = COALESCE($2, email),
           linkedin_email = $2,
           linkedin_sub = $3,
           linkedin_connected = true,
           linkedin_auth_method = 'oauth',
           linkedin_connected_at = NOW(),
           linkedin_profile_url = COALESCE($4, linkedin_profile_url),
           is_active = true,
           updated_at = NOW()
         WHERE id = $5`,
        [name, email, profile.sub, profile.picture || null, existing.id]
      );
      adminId = existing.id;
    } else {
      const insert = await pool.query(
        `INSERT INTO users (
           name, email, role, admin_id,
           linkedin_connected, linkedin_email, linkedin_sub,
           linkedin_auth_method, linkedin_connected_at, linkedin_profile_url,
           is_active, settings, created_at, updated_at
         )
         VALUES ($1, $2, 'admin', NULL, true, $2, $3, 'oauth', NOW(), $4, true, '{}', NOW(), NOW())
         RETURNING id`,
        [name, email, profile.sub, profile.picture || null]
      );
      adminId = insert.rows[0].id;
    }

    // 5. JWT + cookie HttpOnly
    const adminRow = (
      await pool.query(
        `SELECT id, name, email FROM users WHERE id = $1`,
        [adminId]
      )
    ).rows[0];

    const token = await createToken({
      userId: adminRow.id,
      email: adminRow.email,
      role: "admin",
      adminId: null,
      name: adminRow.name,
    });

    // 6. Redirection vers la home (`?welcome=oauth` -> bandeau d'info éventuel)
    const isFirstTime = !existing;
    const origin = getPublicOrigin(request);
    const redirectTarget = isFirstTime
      ? new URL("/?welcome=oauth", origin)
      : new URL("/", origin);
    const res = NextResponse.redirect(redirectTarget);
    setAuthCookie(res, token);
    clearOAuthStateCookie(res);
    return res;
  } catch (error) {
    const detail =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);
    console.error(
      "[linkedin/callback] unexpected error:",
      detail,
      error instanceof Error ? error.stack : undefined
    );
    const res = loginErrorRedirect(
      request,
      `Erreur inattendue durant l'authentification LinkedIn (${detail}).`
    );
    clearOAuthStateCookie(res);
    return res;
  }
}
