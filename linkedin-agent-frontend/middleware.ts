import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// =============================================
// Rate limiting in-memory (Edge Runtime compatible)
// =============================================
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetAt) rateLimitMap.delete(key);
    }
  }, 5 * 60 * 1000);
}

// =============================================
// Security Middleware
// Headers de sécurité, rate limiting, validation origin
// =============================================

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 0. Rate limiting par IP pour toutes les routes API (sauf monitoring)
  const isMonitoringEndpoint =
    request.nextUrl.pathname === "/api/metrics" ||
    request.nextUrl.pathname === "/api/health";

  if (request.nextUrl.pathname.startsWith("/api/") && !isMonitoringEndpoint) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimit = checkRateLimit(ip, 100, 60000); // 100 req/min par IP
    if (!rateLimit.allowed) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
        },
      });
    }
    response.headers.set("X-RateLimit-Limit", "100");
    response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
    response.headers.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());
  }

  // 1. Security Headers (protection XSS, clickjacking, MIME sniffing)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // 2. Strict Transport Security (HSTS) — force HTTPS en production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  // 3. Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-inline requis pour Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.licdn.com https://*.linkedin.com",
    "connect-src 'self' https://api.openai.com https://*.neon.tech",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  // 4. CORS pour les API routes — Whitelist stricte
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL,        // domaine de production (ex: https://app.example.com)
    ].filter(Boolean) as string[];

    const isAllowed =
      origin &&
      (origin.startsWith("chrome-extension://") ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        allowedOrigins.includes(origin));

    if (isAllowed) {
      response.headers.set("Access-Control-Allow-Origin", origin!);
      response.headers.set("Access-Control-Allow-Credentials", "true");
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
      );
    } else {
      // Origine non autorisée : supprimer tout header CORS qu'un route handler aurait défini
      response.headers.delete("Access-Control-Allow-Origin");
      response.headers.delete("Access-Control-Allow-Credentials");
      response.headers.delete("Access-Control-Allow-Methods");
      response.headers.delete("Access-Control-Allow-Headers");
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
