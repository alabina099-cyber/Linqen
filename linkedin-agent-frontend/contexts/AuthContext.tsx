"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// Patch global de fetch : injecte automatiquement le token JWT (utilisateurs secondaires)
// sur tous les appels vers /api. Les admins (session LinkedIn par cookie) n'ont pas de token
// et sont résolus côté serveur. S'exécute une seule fois côté client.
if (typeof window !== "undefined" && !(window as any).__authFetchPatched) {
  (window as any).__authFetchPatched = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;
      const isApi =
        !!url &&
        (url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`));
      const token = localStorage.getItem("auth_token");
      if (isApi && token) {
        const headers = new Headers(
          init?.headers || (input instanceof Request ? input.headers : undefined)
        );
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${token}`);
        }
        init = { ...init, headers };
      }
    } catch {
      // En cas d'erreur, on laisse passer la requête originale sans modification
    }
    return originalFetch(input as any, init);
  };
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  adminId?: number | null;
  linkedinConnected?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const resolveUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/auth/me", { headers });
      const data = await res.json();

      if (data.success && data.user) {
        setUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role === "admin" ? "admin" : "user",
          adminId: data.user.adminId || data.user.admin_id || null,
          linkedinConnected: data.user.linkedinConnected || data.user.linkedin_connected,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    resolveUser();
  }, [resolveUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem("auth_token", data.token);
        setUser({
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          adminId: data.user.adminId,
        });
        return { success: true };
      }
      return { success: false, error: data.error || "Erreur de connexion" };
    } catch {
      return { success: false, error: "Erreur réseau" };
    }
  };

  const logout = async () => {
    // Supprimer le token JWT (user secondaire)
    localStorage.removeItem("auth_token");
    // Supprimer la session LinkedIn (admin)
    try {
      await fetch("/api/linkedin-auth", { method: "DELETE" });
    } catch {
      // ignore
    }
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAdmin: user?.role === "admin",
        refreshUser: resolveUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
