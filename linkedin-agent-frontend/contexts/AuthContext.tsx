"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// =============================================================
// AuthContext — JWT stocké en cookie HttpOnly côté serveur
// -------------------------------------------------------------
// Plus de localStorage ! Le navigateur envoie automatiquement le
// cookie HttpOnly sur toutes les requêtes same-origin vers /api.
// JavaScript ne peut PAS lire ce cookie -> protection XSS.
// =============================================================

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
      // Le cookie HttpOnly est envoyé automatiquement par le navigateur.
      const res = await fetch("/api/auth/me", { credentials: "include" });
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
        // Propager le token JWT à l'extension Chrome (bridge) pour les actions LinkedIn
        if (data.token) {
          try {
            localStorage.setItem("auth_token", data.token);
            window.postMessage({ type: "SET_AUTH_TOKEN", token: data.token }, "*");
          } catch {
            // bridge extension absent : non-fatal
          }
        }
        // Propager l'URL du dashboard à l'extension
        try {
          window.postMessage({ type: "SET_SERVER_URL", serverUrl: window.location.origin }, "*");
        } catch {
          // bridge extension absent : non-fatal
        }
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
        credentials: "include", // recevoir le cookie HttpOnly Set-Cookie
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Le serveur a posé le cookie HttpOnly. On NE stocke PAS le JWT
        // côté JS pour éviter toute exfiltration via XSS.
        // (data.token est uniquement renvoyé pour la compat extension Chrome.)
        // On propage tout de même le token à l'extension via postMessage.
        if (data.token) {
          try {
            window.postMessage({ type: "SET_AUTH_TOKEN", token: data.token }, "*");
          } catch {
            // bridge extension absent : non-fatal
          }
        }
        // Propager aussi l'URL du dashboard à l'extension
        try {
          window.postMessage({ type: "SET_SERVER_URL", serverUrl: window.location.origin }, "*");
        } catch {
          // bridge extension absent : non-fatal
        }
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
    // 1. Côté serveur : supprime le cookie HttpOnly + déconnecte la session LinkedIn admin
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // non-fatal
    }
    try {
      await fetch("/api/linkedin-auth", { method: "DELETE", credentials: "include" });
    } catch {
      // non-fatal
    }
    // 2. Propager le logout à l'extension Chrome (clear token in storage)
    try {
      window.postMessage({ type: "SET_AUTH_TOKEN", token: null }, "*");
    } catch {
      // non-fatal
    }
    // 3. Reset state local
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
