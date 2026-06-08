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
  Sparkles,
  Cookie,
  Puzzle,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { sendExtensionRequest } from "@/lib/extensionBridge";

export default function LoginPage() {
  const { login, refreshUser } = useAuth();
  const [mode, setMode] = useState<"choose" | "linkedin" | "credentials">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [linkedinChecking, setLinkedinChecking] = useState(false);

  // LinkedIn cookie form state
  const [cookieValue, setCookieValue] = useState("");
  const [cookieName, setCookieName] = useState("");
  const [cookieEmail, setCookieEmail] = useState("");
  const [showCookie, setShowCookie] = useState(false);
  const [copied, setCopied] = useState(false);

  // Ne pas rediriger auto sur /login pour laisser l'utilisateur choisir
  // son mode de connexion (Admin LinkedIn vs User credentials)

  // Vérifier si un admin est connecté via LinkedIn — on ne redirige PAS auto
  // pour laisser l'utilisateur choisir entre Admin (LinkedIn) ou User (credentials)
  useEffect(() => {
    const checkLinkedIn = async () => {
      try {
        const res = await fetch("/api/linkedin-auth");
        const data = await res.json();
        if (data.connected) {
          // Pré-remplir les infos admin sans rediriger
          await refreshUser();
        }
      } catch {
        // ignore
      }
    };
    checkLinkedIn();
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

  const handleLinkedInCookie = async () => {
    if (!cookieValue.trim() || !cookieName.trim()) {
      setError("Cookie and name are required.");
      return;
    }
    setError("");
    setLinkedinChecking(true);
    try {
      const res = await fetch("/api/linkedin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "cookie",
          cookie: cookieValue.trim(),
          name: cookieName.trim(),
          email: cookieEmail.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await refreshUser();
        window.location.href = "/";
      } else {
        setError(data.error || "Connection error.");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLinkedinChecking(false);
    }
  };

  const fetchCookieFromExtension = async () => {
    setError("");
    setLinkedinChecking(true);
    try {
      const result = await sendExtensionRequest("GET_LINKEDIN_COOKIE");
      if (result.success && typeof result.cookie === "string") {
        setCookieValue(result.cookie);
        setShowCookie(false);
      } else {
        const msg = result.error || "Unable to fetch the cookie.";
        setError(
          msg.includes("n'a pas répondu")
            ? "Chrome extension not detected. Install/enable the extension then reload."
            : msg
        );
      }
    } finally {
      setLinkedinChecking(false);
    }
  };

  const copyInstructions = () => {
    navigator.clipboard.writeText(
      "1. Open linkedin.com in Chrome\n2. F12 → Application → Cookies → linkedin.com\n3. Find the li_at cookie and copy its value"
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-8"
            >
              <button
                onClick={() => { setMode("choose"); setError(""); }}
                className="text-slate-400 hover:text-slate-600 text-sm mb-6 flex items-center gap-1 transition-colors"
              >
                ← Back
              </button>

              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0A66C2] to-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
                  <Linkedin className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Admin Login</h2>
                <p className="text-slate-500 text-sm">Paste your LinkedIn cookie to authenticate.</p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Instructions */}
              <div className="mb-5 bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-amber-800">How to get your li_at cookie</span>
                  <button onClick={copyInstructions} className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { n: "1", t: "Open linkedin.com" },
                    { n: "2", t: "F12 → Application" },
                    { n: "3", t: "Cookies → linkedin.com" },
                    { n: "4", t: "Copy li_at" },
                  ].map((s) => (
                    <div key={s.n} className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-lg border border-amber-100">
                      <span className="w-4 h-4 bg-amber-200 text-amber-800 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{s.n}</span>
                      <span className="text-[11px] text-slate-700">{s.t}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-700">Cookie li_at <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={fetchCookieFromExtension}
                      disabled={linkedinChecking}
                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 transition-colors"
                    >
                      {linkedinChecking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Puzzle className="w-3 h-3" />}
                      Fetch via extension
                    </button>
                  </div>
                  <div className="relative">
                    <Cookie className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showCookie ? "text" : "password"}
                      value={cookieValue}
                      onChange={(e) => setCookieValue(e.target.value)}
                      placeholder="AQEDATxxxxxx... or click Fetch via extension"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                    <button type="button" onClick={() => setShowCookie(!showCookie)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showCookie ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={cookieName}
                      onChange={(e) => setCookieName(e.target.value)}
                      placeholder="First Last"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email (optional)</label>
                    <input
                      type="email"
                      value={cookieEmail}
                      onChange={(e) => setCookieEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <a
                    href="https://www.linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    LinkedIn
                  </a>
                  <button
                    onClick={handleLinkedInCookie}
                    disabled={linkedinChecking || !cookieValue.trim() || !cookieName.trim()}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0A66C2] to-indigo-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {linkedinChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Linkedin className="w-4 h-4" />}
                    {linkedinChecking ? "Connecting..." : "Log in"}
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-slate-400 mt-4">
                By connecting, you automatically become the administrator of this account.
              </p>
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
