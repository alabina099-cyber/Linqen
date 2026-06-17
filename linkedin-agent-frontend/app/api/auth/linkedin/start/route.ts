import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { setOAuthStateCookie } from "@/lib/auth-cookies";
import { checkAuthRateLimit, getClientIp } from "@/lib/auth-rate-limit";

// =============================================================
// GET /api/auth/linkedin/start
// -------------------------------------------------------------
// Démarre le flow OAuth 2.0 LinkedIn (Sign In with LinkedIn v2).
//   1. Génère un state aléatoire (protection CSRF).
//   2. Stocke ce state dans un cookie HttpOnly court (10 min).
//   3. Redirige le navigateur vers la page de consentement LinkedIn.
//
// Variables d'env requises :
//   - LINKEDIN_CLIENT_ID
//   - LINKEDIN_REDIRECT_URI (ex: https://app.example.com/api/auth/linkedin/callback)
// =============================================================
export async function GET(request: NextRequest) {
  // Rate limit : empêche l'enrôlement automatisé du flow OAuth.
  const ip = getClientIp(request);
  const rl = checkAuthRateLimit(`linkedin-start:${ip}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter ?? 60) } }
    );
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "OAuth LinkedIn non configuré (LINKEDIN_CLIENT_ID / LINKEDIN_REDIRECT_URI manquants).",
      },
      { status: 500 }
    );
  }

  const state = randomUUID();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state,
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

  const res = NextResponse.redirect(authUrl);
  setOAuthStateCookie(res, state);
  return res;
}
