// =============================================
// Auth Utilities
// JWT + Password hashing pour le système Admin / User
// =============================================

import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { hash, safeCompare } from "./security";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required but not set.");
  }
  return new TextEncoder().encode(secret);
}

export interface AuthPayload {
  userId: number;
  email: string;
  role: "admin" | "user";
  adminId?: number | null;
  name: string;
}

// =============================================
// JWT Token
// =============================================

export async function createToken(payload: AuthPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), { clockTolerance: 60 });
    return payload as unknown as AuthPayload;
  } catch {
    return null;
  }
}

// =============================================
// Password
// =============================================

export function hashPassword(password: string): string {
  // Utilise la fonction hash SHA256 existante + un salt simple basé sur le password
  const salt = hash(password.slice(0, 4) + "linkedin-agent-salt");
  return hash(password + salt) + ":" + salt;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [hashPart, salt] = storedHash.split(":");
  if (!hashPart || !salt) return false;
  return safeCompare(hash(password + salt), hashPart);
}

// =============================================
// Admin check
// =============================================

export function isAdmin(role: string): boolean {
  return role === "admin";
}

export function isUser(role: string): boolean {
  return role === "user";
}
