// =============================================================
// Auth Rate Limiter — protection brute-force sur endpoints
// d'authentification (login, OAuth start, linkedin-auth POST).
// -------------------------------------------------------------
// Algo : token bucket simple en mémoire, par clé (IP + endpoint).
// Limite par défaut : 5 tentatives / 10 min par IP.
//
// NOTE : pour une infra multi-instance, remplacer par Redis.
// Pour l'instant (1 instance Coolify), in-memory suffit.
// =============================================================

import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Nettoyage périodique des buckets expirés (anti memory leak)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets.entries()) {
      if (b.resetAt < now) buckets.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  // unref pour ne pas bloquer le process en test
  if (typeof (cleanupTimer as any).unref === "function") {
    (cleanupTimer as any).unref();
  }
}

export interface RateLimitDecision {
  ok: boolean;
  retryAfter?: number; // secondes
  remaining: number;
}

export function checkAuthRateLimit(
  key: string,
  max = 5,
  windowMs = 10 * 60 * 1000
): RateLimitDecision {
  ensureCleanup();
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }

  b.count++;
  if (b.count > max) {
    return {
      ok: false,
      retryAfter: Math.ceil((b.resetAt - now) / 1000),
      remaining: 0,
    };
  }
  return { ok: true, remaining: max - b.count };
}

// Réinitialise le compteur (à appeler après un login réussi)
export function resetAuthRateLimit(key: string): void {
  buckets.delete(key);
}

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
