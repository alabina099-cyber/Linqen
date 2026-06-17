// =============================================
// Security Utilities
// Chiffrement, validation, et sanitization
// =============================================

import crypto from "crypto";

// =============================================
// 1. ENCRYPTION (AES-256-GCM)
// =============================================
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY environment variable is required and must be at least 32 characters.");
  }
  return Buffer.from(key.slice(0, 32), "utf-8");
}

// Chiffrer une chaîne sensible (tokens API, credentials, etc.)
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (tous en hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

// Déchiffrer une chaîne chiffrée
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf-8");
}

// =============================================
// 2. INPUT SANITIZATION (XSS prevention)
// =============================================
export function sanitizeHtml(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Supprimer les caractères dangereux pour SQL (en complément des requêtes paramétrées)
export function sanitizeSqlIdentifier(input: string): string {
  if (typeof input !== "string") return "";
  // Autoriser uniquement alphanumériques + underscore
  return input.replace(/[^a-zA-Z0-9_]/g, "");
}

// =============================================
// 3. INPUT VALIDATION
// =============================================
export const validators = {
  email: (v: string): boolean =>
    typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),

  linkedinUrl: (v: string): boolean =>
    typeof v === "string" &&
    /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?$/i.test(v),

  url: (v: string): boolean => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  },

  positiveInt: (v: any): boolean =>
    Number.isInteger(Number(v)) && Number(v) >= 0,

  // Vérifier qu'une valeur est dans une whitelist (anti-injection)
  enum: (v: any, allowed: string[]): boolean =>
    typeof v === "string" && allowed.includes(v),

  // Longueur max pour éviter les attaques DoS
  maxLength: (v: string, max: number): boolean =>
    typeof v === "string" && v.length <= max,

  // Pas de scripts dans les chaînes
  noScript: (v: string): boolean =>
    typeof v === "string" &&
    !/<script|javascript:|on\w+\s*=/i.test(v),
};

// Valider un objet selon un schéma
export function validate(
  data: Record<string, any>,
  schema: Record<string, (v: any) => boolean>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const [field, check] of Object.entries(schema)) {
    if (!check(data[field])) {
      errors.push(`Invalid field: ${field}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// =============================================
// 4. RATE LIMITING (par IP)
// =============================================
const apiRateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkApiRateLimit(
  identifier: string,
  maxRequests = 100,
  windowMs = 60000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = apiRateLimits.get(identifier);

  if (!entry || now > entry.resetAt) {
    apiRateLimits.set(identifier, { count: 1, resetAt: now + windowMs });
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

// Cleanup automatique des entrées expirées
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of apiRateLimits.entries()) {
      if (now > entry.resetAt) apiRateLimits.delete(key);
    }
  }, 5 * 60 * 1000);
}

// =============================================
// 5. CSRF / Origin validation
// =============================================
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const allowed = [
    "http://localhost:3000",
    "http://localhost:3001",
    "chrome-extension://",
    process.env.NEXT_PUBLIC_APP_URL || "",
  ].filter(Boolean);
  return allowed.some((a) => origin.startsWith(a));
}

// =============================================
// 6. SECURE HASH (pour comparer des données sensibles)
// =============================================
export function hash(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// Constant-time comparison pour éviter les timing attacks
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
