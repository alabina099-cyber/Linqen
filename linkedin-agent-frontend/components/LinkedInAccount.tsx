"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Cookie,
  ExternalLink,
  LogOut,
  RefreshCw,
  Shield,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Copy,
  Check,
  Linkedin,
  User,
  Mail,
  Calendar,
  Wifi,
  WifiOff,
  ChevronRight,
  Zap,
} from "lucide-react";

interface LinkedInStatus {
  connected: boolean;
  email: string | null;
  name: string | null;
  auth_method: string | null;
  connected_at: string | null;
}

type AuthMethod = "cookie" | "oauth" | null;

export default function LinkedInAccount() {
  const [status, setStatus] = useState<LinkedInStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<AuthMethod>(null);

  // Cookie method state
  const [cookieValue, setCookieValue] = useState("");
  const [cookieName, setCookieName] = useState("");
  const [cookieEmail, setCookieEmail] = useState("");
  const [showCookie, setShowCookie] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/linkedin-auth");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false, email: null, name: null, auth_method: null, connected_at: null });
    } finally {
      setLoading(false);
    }
  }

  async function connectViaCookie() {
    if (!cookieValue.trim()) {
      setError("Le cookie est requis.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/linkedin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "cookie",
          cookie: cookieValue.trim(),
          email: cookieEmail.trim() || undefined,
          name: cookieName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Compte LinkedIn connecté avec succés via cookie !");
        setSelectedMethod(null);
        setCookieValue("");
        setCookieName("");
        setCookieEmail("");
        await fetchStatus();
      } else {
        setError(data.error || "Erreur lors de la connexion.");
      }
    } catch {
      setError("Erreur réseau. Vérifiez que le serveur est lancé.");
    } finally {
      setSaving(false);
    }
  }

  async function connectViaOAuth() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/linkedin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "oauth",
          email: cookieEmail.trim() || undefined,
          name: cookieName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Méthode OAuth enregistrée. L'extension va capturer votre session LinkedIn automatiquement lors de votre prochaine connexion sur linkedin.com.");
        setSelectedMethod(null);
        await fetchStatus();
      } else {
        setError(data.error || "Erreur.");
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!confirm("Déconnecter le compte LinkedIn ?")) return;
    try {
      await fetch("/api/linkedin-auth", { method: "DELETE" });
      setSuccess("Compte déconnecté.");
      setSelectedMethod(null);
      setStatus({ connected: false, email: null, name: null, auth_method: null, connected_at: null });
    } catch {
      setError("Erreur lors de la déconnexion.");
    }
  }

  function copyInstructions() {
    const text = "Comment trouver votre cookie LinkedIn :\n1. Ouvrez LinkedIn.com dans Chrome et connectez-vous\n2. Appuyez sur F12 pour ouvrir les DevTools\n3. Allez dans l'onglet Application > Cookies > linkedin.com\n4. Trouvez le cookie et copiez sa valeur";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="text-sm text-gray-500">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Feedback messages */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ===== CONNECTION STATUS BANNER ===== */}
      <div className={`rounded-2xl p-5 ${status?.connected
        ? "bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 border border-green-200"
        : "bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 border border-amber-200"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Status Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${status?.connected
              ? "bg-gradient-to-br from-emerald-400 to-green-500"
              : "bg-gradient-to-br from-amber-400 to-orange-500"
            }`}>
              {status?.connected
                ? <Wifi className="w-6 h-6 text-white" />
                : <WifiOff className="w-6 h-6 text-white" />
              }
            </div>
            {/* Status Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${status?.connected ? "text-green-800" : "text-amber-800"}`}>
                  {status?.connected ? "Compte LinkedIn connecté" : "Aucun compte connecté"}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${status?.connected
                  ? "bg-green-200 text-green-800"
                  : "bg-amber-200 text-amber-800"
                }`}>
                  {status?.connected ? "Actif" : "Inactif"}
                </span>
              </div>
              {status?.connected ? (
                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-600">
                  {status.name && (
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {status.name}
                    </span>
                  )}
                  {status.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {status.email}
                    </span>
                  )}
                  {status.auth_method && (
                    <span className="flex items-center gap-1">
                      {status.auth_method === "cookie"
                        ? <Cookie className="w-3.5 h-3.5 text-orange-500" />
                        : <ExternalLink className="w-3.5 h-3.5 text-purple-500" />
                      }
                      {status.auth_method === "cookie" ? "Cookie" : "Auth"}
                    </span>
                  )}
                  {status.connected_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(status.connected_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Connectez votre compte pour activer les actions LinkedIn</p>
              )}
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              className="p-2 rounded-lg hover:bg-white/60 text-gray-400 hover:text-gray-600 transition-colors"
              title="Rafra\u00eechir le statut"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {status?.connected && (
              <button
                onClick={disconnect}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-600 hover:text-red-600 rounded-lg text-xs font-medium transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Déconnecter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== CONNECTION METHODS (shown when no form is selected) ===== */}
      {!selectedMethod && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {status?.connected ? "Changer de méthode" : "Méthode de connexion"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Cookie Method */}
            <button
              onClick={() => { setSelectedMethod("cookie"); setError(""); setSuccess(""); }}
              className="group relative flex items-center gap-4 p-4 bg-white border-2 border-gray-100 hover:border-orange-300 rounded-xl transition-all hover:shadow-md text-left"
            >
              <div className="w-11 h-11 bg-orange-100 group-hover:bg-orange-200 rounded-xl flex items-center justify-center transition-colors shrink-0">
                <Cookie className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">Via Cookie</span>
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase">Recommanded</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Copiez le cookie depuis votre navigateur Chrome</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors shrink-0" />
            </button>

            {/* OAuth Method */}
            <button
              onClick={() => { setSelectedMethod("oauth"); setError(""); setSuccess(""); }}
              className="group relative flex items-center gap-4 p-4 bg-white border-2 border-gray-100 hover:border-purple-300 rounded-xl transition-all hover:shadow-md text-left"
            >
              <div className="w-11 h-11 bg-purple-100 group-hover:bg-purple-200 rounded-xl flex items-center justify-center transition-colors shrink-0">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">Via Auth</span>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">Simple</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{"L'extension capture automatiquement votre session"}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors shrink-0" />
            </button>
          </div>

          {/* Extension info - inline */}
          <div className="mt-3 flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-xs text-gray-600">
              {"L'extension LinkedIn Agent doit \u00eatre installée et active dans Chrome. Le statut \u00ab Connecté \u00bb dans le popup de l'extension confirme que tout est opérationnel."}
            </p>
          </div>
        </div>
      )}

      {/* ===== COOKIE METHOD FORM ===== */}
      {selectedMethod === "cookie" && (
        <div className="border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-gray-900 text-sm">Connexion par Cookie</h3>
            </div>
            <button onClick={() => setSelectedMethod(null)} className="text-xs text-gray-400 hover:text-gray-600 font-medium px-2 py-1 hover:bg-white/50 rounded-lg transition-colors">
              Annuler
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg border border-orange-100 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Comment trouver votre cookie</span>
              <button onClick={copyInstructions} className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copié !" : "Copier"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { n: "1", t: "Ouvrez linkedin.com" },
                { n: "2", t: "F12 \u2192 DevTools" },
                { n: "3", t: "Application \u2192 Cookies" },
                { n: "4", t: "Copiez" },
              ].map((step) => (
                <div key={step.n} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-50 rounded-lg">
                  <span className="w-4 h-4 bg-orange-200 text-orange-800 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{step.n}</span>
                  <span className="text-[11px] text-gray-700 font-medium">{step.t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cookie<span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type={showCookie ? "text" : "password"}
                  value={cookieValue}
                  onChange={(e) => setCookieValue(e.target.value)}
                  placeholder="AQEDATxxxxxxxxxxxxxxx..."
                  className="w-full pr-10 pl-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 font-mono bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCookie(!showCookie)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCookie ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom (optionnel)</label>
                <input
                  type="text"
                  value={cookieName}
                  onChange={(e) => setCookieName(e.target.value)}
                  placeholder="Jean Dupont"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email (optionnel)</label>
                <input
                  type="email"
                  value={cookieEmail}
                  onChange={(e) => setCookieEmail(e.target.value)}
                  placeholder="jean@exemple.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-amber-100/60 border border-amber-200 rounded-lg text-[11px] text-amber-800">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            {"Le cookie est stocké de manière sécurisée dans votre base de données locale."}
          </div>

          <button
            onClick={connectViaCookie}
            disabled={saving || !cookieValue.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cookie className="w-4 h-4" />}
            {saving ? "Connexion en cours..." : "Connecter via Cookie"}
          </button>
        </div>
      )}

      {/* ===== OAUTH METHOD FORM ===== */}
      {selectedMethod === "oauth" && (
        <div className="border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-gray-900 text-sm">Connexion via Auth / Extension</h3>
            </div>
            <button onClick={() => setSelectedMethod(null)} className="text-xs text-gray-400 hover:text-gray-600 font-medium px-2 py-1 hover:bg-white/50 rounded-lg transition-colors">
              Annuler
            </button>
          </div>

          <div className="bg-white rounded-lg border border-purple-100 p-3.5">
            <span className="text-xs font-semibold text-gray-700 mb-2 block">Comment fonctionne</span>
            <div className="flex flex-wrap gap-2">
              {[
                { n: "1", t: "Activez la capture" },
                { n: "2", t: "Extension détecte la session" },
                { n: "3", t: "Connectez-vous sur LinkedIn" },
                { n: "4", t: "Cookie capturé automatiquement" },
              ].map((step) => (
                <div key={step.n} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 rounded-lg">
                  <span className="w-4 h-4 bg-purple-200 text-purple-800 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{step.n}</span>
                  <span className="text-[11px] text-gray-700 font-medium">{step.t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nom (optionnel)</label>
              <input
                type="text"
                value={cookieName}
                onChange={(e) => setCookieName(e.target.value)}
                placeholder="Jean Dupont"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email (optionnel)</label>
              <input
                type="email"
                value={cookieEmail}
                onChange={(e) => setCookieEmail(e.target.value)}
                placeholder="jean@exemple.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 bg-white"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 hover:text-blue-700 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Ouvrir LinkedIn
            </a>
            <button
              onClick={connectViaOAuth}
              disabled={saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {saving ? "Activation..." : "Activer la capture"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
