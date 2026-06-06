"use client";

import { useState, useEffect } from "react";
import { sendExtensionRequest } from "@/lib/extensionBridge";
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
  User,
  Mail,
  Calendar,
  Wifi,
  WifiOff,
  ChevronRight,
  Puzzle,
} from "lucide-react";

interface LinkedInStatus {
  connected: boolean;
  email: string | null;
  name: string | null;
  auth_method: string | null;
  connected_at: string | null;
}

type AuthMethod = "cookie" | "extension" | null;

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
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

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

  async function fetchCookieViaExtension() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const result = await sendExtensionRequest("GET_LINKEDIN_COOKIE");
      if (result.success && typeof result.cookie === "string") {
        setCookieValue(result.cookie);
        setShowCookie(false);
      } else {
        const msg = result.error || "Impossible de récupérer le cookie.";
        if (msg.includes("n'a pas répondu")) {
          setError("Extension Chrome non détectée. Installez/activez l'extension puis rechargez cette page.");
        } else {
          setError(msg);
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function connectViaExtension() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Demander à l'extension de capturer le cookie li_at et de l'envoyer au backend
      const result = await sendExtensionRequest("CAPTURE_LINKEDIN_COOKIE");
      if (result.success) {
        setSuccess(result.message || "Compte LinkedIn connecté via l'extension !");
        setSelectedMethod(null);
        await fetchStatus();
      } else {
        const msg = result.error || "Erreur lors de la capture par l'extension.";
        if (msg.toLowerCase().includes("li_at") || msg.toLowerCase().includes("cookie")) {
          setError("Cookie LinkedIn introuvable. Connectez-vous d'abord sur linkedin.com puis réessayez.");
        } else if (msg.includes("n'a pas répondu")) {
          setError("Extension Chrome non détectée. Installez/activez l'extension LinkedIn Agent puis rechargez cette page.");
        } else {
          setError(msg);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/linkedin-auth", { method: "DELETE" });
      setSelectedMethod(null);
      setStatus({ connected: false, email: null, name: null, auth_method: null, connected_at: null });
      setShowDisconnectModal(false);
    } catch {
      setError("Erreur lors de la déconnexion.");
    } finally {
      setDisconnecting(false);
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
      {/* ===== CONNECTION STATUS BANNER ===== */}
      <div className={`rounded-2xl p-5 border ${status?.connected
        ? "bg-white border-gray-200 shadow-sm"
        : "bg-white border-gray-200 shadow-sm"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            {/* Status Icon — aligned with title */}
            <div className="flex items-center justify-center mt-0.5">
              {status?.connected
                ? <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                : <WifiOff className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
              }
            </div>
            {/* Status Info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">
                  {status?.connected ? "Compte LinkedIn connecté" : "Aucun compte connecté"}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${status?.connected
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-500"
                }`}>
                  {status?.connected ? "Connecté" : "Déconnecté"}
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
                        : <Shield className="w-3.5 h-3.5 text-blue-500" />
                      }
                      {status.auth_method === "cookie" ? "Cookie" : "Extension"}
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
                onClick={() => setShowDisconnectModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/80 hover:bg-red-50 border border-gray-200 hover:border-red-300 text-gray-600 hover:text-red-600 rounded-lg text-xs font-medium transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Déconnecter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feedback messages — errors only */}
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

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
                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] font-bold uppercase">Recommanded</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Copiez le cookie depuis votre navigateur Chrome</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors shrink-0" />
            </button>

            {/* Extension Method */}
            <button
              onClick={() => { setSelectedMethod("extension"); setError(""); setSuccess(""); }}
              className="group relative flex items-center gap-4 p-4 bg-white border-2 border-gray-100 hover:border-blue-300 rounded-xl transition-all hover:shadow-md text-left"
            >
              <div className="w-11 h-11 bg-blue-100 group-hover:bg-blue-200 rounded-xl flex items-center justify-center transition-colors shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">Via Extension</span>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">Automatique</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{"Capture automatique de session via l'extension Chrome"}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Cookie<span className="text-red-500">*</span></label>
                <button
                  type="button"
                  onClick={fetchCookieViaExtension}
                  disabled={saving}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  <Puzzle className="w-3 h-3" />
                  Récupérer via extension
                </button>
              </div>
              <div className="relative">
                <input
                  type={showCookie ? "text" : "password"}
                  value={cookieValue}
                  onChange={(e) => setCookieValue(e.target.value)}
                  placeholder="Collez votre cookie li_at ou cliquez sur Récupérer via extension"
                  className="w-full pr-10 pl-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white"
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
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nom <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={cookieName}
                  onChange={(e) => setCookieName(e.target.value)}
                  placeholder="Prénom Nom"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email (optionnel)</label>
                <input
                  type="email"
                  value={cookieEmail}
                  onChange={(e) => setCookieEmail(e.target.value)}
                  placeholder="exemple@exemple.com"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white"
                />
              </div>
            </div>
          </div>

          <button
            onClick={connectViaCookie}
            disabled={saving || !cookieValue.trim() || !cookieName.trim()}
            className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cookie className="w-4 h-4" />}
            {saving ? "Connexion en cours..." : "Connecter via Cookie"}
          </button>
        </div>
      )}

      {/* ===== EXTENSION METHOD FORM ===== */}
      {selectedMethod === "extension" && (
        <div className="border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">Connexion via Extension</h3>
            </div>
            <button onClick={() => setSelectedMethod(null)} className="text-xs text-gray-400 hover:text-gray-600 font-medium px-2 py-1 hover:bg-white/50 rounded-lg transition-colors">
              Annuler
            </button>
          </div>

          <div className="bg-white rounded-lg border border-blue-100 p-3.5">
            <span className="text-xs font-semibold text-gray-700 mb-2 block">Comment fonctionne</span>
            <div className="flex flex-wrap gap-2">
              {[
                { n: "1", t: "Activez la capture" },
                { n: "2", t: "Extension détecte la session" },
                { n: "3", t: "Connectez-vous sur LinkedIn" },
                { n: "4", t: "Cookie capturé automatiquement" },
              ].map((step) => (
                <div key={step.n} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 rounded-lg">
                  <span className="w-4 h-4 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{step.n}</span>
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
                placeholder="Prénom Nom"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email (optionnel)</label>
              <input
                type="email"
                value={cookieEmail}
                onChange={(e) => setCookieEmail(e.target.value)}
                placeholder="exemple@exemple.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
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
              onClick={connectViaExtension}
              disabled={saving}
              className="flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              {saving ? "Activation..." : "Activer la capture"}
            </button>
          </div>
        </div>
      )}

      {/* ===== DISCONNECT CONFIRMATION MODAL ===== */}
      {showDisconnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => !disconnecting && setShowDisconnectModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
          >
            {/* Top accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500" />

            <div className="p-6">
              {/* Icon + title */}
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-red-100 to-rose-100 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" strokeWidth={2.5} />
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    Déconnecter le compte LinkedIn ?
                  </h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                    Vous devrez reconnecter votre compte pour continuer à exécuter des actions LinkedIn. Vos campagnes seront mises en pause.
                  </p>
                </div>
              </div>

              {/* Account info recap */}
              {status?.connected && (status.name || status.email) && (
                <div className="mt-5 p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    {status.name && <div className="text-sm font-semibold text-gray-900 truncate">{status.name}</div>}
                    {status.email && <div className="text-xs text-gray-500 truncate">{status.email}</div>}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowDisconnectModal(false)}
                  disabled={disconnecting}
                  className="flex-1 px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-all text-sm disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDisconnect}
                  disabled={disconnecting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-semibold rounded-xl transition-all text-sm shadow-md shadow-red-500/30 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {disconnecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Déconnexion...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Déconnecter
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
