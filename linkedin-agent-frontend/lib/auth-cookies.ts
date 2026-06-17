// =============================================================
// Auth Cookies — JWT stocké en cookie HttpOnly
// -------------------------------------------------------------
// Objectif : protéger le JWT contre les attaques XSS.
//   - HttpOnly : JavaScript ne peut PAS lire le cookie.
//   - Secure   : envoyé uniquement en HTTPS (prod).
//   - SameSite=Lax : protège du CSRF tout en autorisant le
//     redirect OAuth depuis linkedin.com vers notre callback.
// -------------------------------------------------------------
// Compat : on accepte aussi l'entête `Authorization: Bearer ...`
// pour l'extension Chrome et les anciens clients qui s'identifient
// encore via header.
// =============================================================

import type { NextRequest, NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "auth_token";
export const OAUTH_STATE_COOKIE = "linkedin_oauth_state";

// Durée de vie du JWT (doit matcher createToken -> 7 jours)
const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE_SECONDS,
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function setOAuthStateCookie(res: NextResponse, state: string): void {
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60, // 10 minutes pour finir le flow OAuth
  });
}

export function clearOAuthStateCookie(res: NextResponse): void {
  res.cookies.set(OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// Récupère le JWT depuis le cookie OU le header Authorization (compat).
export function getTokenFromRequest(request: NextRequest): string | null {
  const cookie = request.cookies.get(AUTH_COOKIE_NAME);
  if (cookie?.value) return cookie.value;
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  return null;
}
