"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Linkedin,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Users,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  UserPlus,
  LogIn,
} from "lucide-react";

export default function LoginPage() {
  const { login, refreshUser } = useAuth();
  const [mode, setMode] = useState<"choose" | "linkedin" | "credentials">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Admin sign-in (email + password) — pour les admins qui ont déjà un compte
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminSigninLoading, setAdminSigninLoading] = useState(false);

  // Récupère ?error=... renvoyé par /api/auth/linkedin/callback en cas d'échec OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(err);
      setMode("linkedin");
      // Nettoyer l'URL
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  // Si un admin est déjà connecté (cookie HttpOnly), on rafraîchit le contexte
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      window.location.href = "/";
    } else {
      setError(result.error || "Login error");
    }

    setLoading(false);
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setAdminSigninLoading(true);
    const result = await login(adminEmail, adminPassword);
    if (result.success) {
      window.location.href = "/";
    } else {
      setError(result.error || "Login error");
    }
    setAdminSigninLoading(false);
  };

  const handleLinkedInOAuth = () => {
    // Sign Up / Sign In via OAuth 2.0 LinkedIn.
    // Le serveur génère le state CSRF, le pose en cookie HttpOnly,
    // et redirige vers la page de consentement LinkedIn.
    setError("");
    window.location.href = "/api/auth/linkedin/start";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-blue-50 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-5xl px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center mb-3">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent tracking-wide">
              LINQEN
            </span>
          </div>
          <p className="text-slate-500 text-sm">
            Automate your LinkedIn prospecting intelligently
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {mode === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {/* Admin Card */}
              <button
                onClick={() => setMode("linkedin")}
                className="group relative bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 text-left"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-blue-500" />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/20">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  I am an Admin
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  Connect your LinkedIn account to access the dashboard, manage
                  your team and oversee campaigns.
                </p>
                <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                  <Linkedin className="w-4 h-4" />
                  <span>Log in via LinkedIn</span>
                </div>
              </button>

              {/* User Card */}
              <button
                onClick={() => setMode("credentials")}
                className="group relative bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 text-left"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">
                  I am a team member
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                  Log in with your credentials to help with prospecting
                  and manage assigned prospects.
                </p>
                <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
                  <Mail className="w-4 h-4" />
                  <span>Log in with credentials</span>
                </div>
              </button>
            </motion.div>
          )}

          {mode === "linkedin" && (
            <motion.div
              key="linkedin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-5xl mx-auto"
            >
              <button
                onClick={() => { setMode("choose"); setError(""); }}
                className="text-slate-400 hover:text-slate-600 text-sm mb-4 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2 text-sm text-red-600 max-w-2xl mx-auto">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* ============== SIGN UP : OAuth LinkedIn ============== */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0A66C2] to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">First time here</h2>
                      <p className="text-xs text-slate-500">Sign up with LinkedIn</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-5">
                    Create your admin account in one click.
                  </p>

                  <ul className="space-y-2 text-xs text-slate-600 mb-6">
                    <li className="flex items-start gap-2">
                      <Shield className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>Secure OAuth 2.0 — LinkedIn handles authentication.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Mail className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>Your verified email and name are imported automatically.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Lock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <span>Set a password later in Settings to enable email sign-in.</span>
                    </li>
                  </ul>

                  <button
                    onClick={handleLinkedInOAuth}
                    className="mt-auto w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0A66C2] to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Linkedin className="w-5 h-5" />
                    Continue with LinkedIn
                  </button>

                  <p className="text-center text-[11px] text-slate-400 mt-3">
                    By continuing, you become the administrator of your workspace.
                  </p>
                </div>

                {/* ============== SIGN IN : email + password ============== */}
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                      <LogIn className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">Already have an account</h2>
                      <p className="text-xs text-slate-500">Sign in with your credentials</p>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-5">
                    Use the email and password associated with your admin account.
                  </p>

                  <form onSubmit={handleAdminSignIn} className="space-y-3 flex-1 flex flex-col">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          required
                          autoComplete="email"
                          placeholder="admin@example.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showAdminPassword ? "text" : "password"}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={adminSigninLoading}
                      className="mt-auto w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {adminSigninLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Sign in
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-center text-[11px] text-slate-400 mt-3">
                    No password yet? Sign up with LinkedIn first, then set one in Settings.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {mode === "credentials" && (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
            >
              <button
                onClick={() => setMode("choose")}
                className="text-slate-400 hover:text-slate-600 text-sm mb-6 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">
                  Member Login
                </h2>
                <p className="text-slate-500 text-sm">
                  Use the credentials provided by your admin.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCredentialsLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Log in
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-400 mt-4">
                You help with the LinkedIn prospecting of your admin's account.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
