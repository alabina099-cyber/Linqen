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
      setError("Le cookie li_at est requis.");
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
        setSuccess("Compte LinkedIn connect\u00e9 avec succ\u00e8s via cookie !");
        setSelectedMethod(null);
        setCookieValue("");
        setCookieName("");
        setCookieEmail("");
        await fetchStatus();
      } else {
        setError(data.error || "Erreur lors de la connexion.");
      }
    } catch {
      setError("Erreur r\u00e9seau. V\u00e9rifiez que le serveur est lanc\u00e9.");
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
        setSuccess("M\u00e9thode OAuth enregistr\u00e9e. L'extension va capturer votre session LinkedIn automatiquement lors de votre prochaine connexion sur linkedin.com.");
        setSelectedMethod(null);
        await fetchStatus();
      } else {
        setError(data.error || "Erreur.");
      }
    } catch {
      setError("Erreur r\u00e9seau.");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!confirm("Déconnecter le compte LinkedIn ?")) return;
    try {
      await fetch("/api/linkedin-auth", { method: "DELETE" });
      setSuccess("Compte d\u00e9connect\u00e9.");
      setSelectedMethod(null);
      setStatus({ connected: false, email: null, name: null, auth_method: null, connected_at: null });
    } catch {
      setError("Erreur lors de la d\u00e9connexion.");
    }
  }

  function copyInstructions() {
    const text = `Comment trouver votre cookie LinkedIn (li_at):
1. Ouvrez LinkedIn.com dans Chrome et connectez-vous
2. Appuyez sur F12 pour ouvrir les DevTools
3. Allez dans l'onglet "Application" (ou "Storage")
4. D\u00e9roulez "Cookies" > "https://www.linkedin.com"
5. Trouvez le cookie nomm\u00e9 "li_at"
6. Copiez sa valeur et collez-la ici`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header - same style as Messages */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Linkedin className="w-8 h-8 text-blue-600" />
          Compte LinkedIn
        </h1>
        <p className="text-gray-600 mt-1">Connectez votre compte pour permettre à l'extension Chrome d'agir en votre nom.</p>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Status + Extension info */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className={`rounded-2xl border-2 p-6 ${status?.connected ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50" : "border-gray-200 bg-gradient-to-br from-gray-50 to-slate-50"}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {status?.connected ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-gray-400" />
                )}
                <span className={`text-sm font-bold ${status?.connected ? "text-green-700" : "text-gray-600"}`}>
                  {status?.connected ? "Connecté" : "Déconnecté"}
                </span>
              </div>
              <button onClick={fetchStatus} className="p-2 rounded-lg hover:bg-white/80 text-gray-400 hover:text-gray-600 transition-colors" title="Rafra\u00eechir">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {status?.connected ? (
              <div className="space-y-3">
                {status.name && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-700">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium">{status.name}</span>
                  </div>
                )}
                {status.email && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{status.email}</span>
                  </div>
                )}
                {status.auth_method && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-700">
                    {status.auth_method === "cookie" ? <Cookie className="w-4 h-4 text-orange-500 shrink-0" /> : <ExternalLink className="w-4 h-4 text-purple-500 shrink-0" />}
                    <span>Via {status.auth_method === "cookie" ? "Cookie li_at" : "OAuth"}</span>
                  </div>
                )}
                {status.connected_at && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-500">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>Connecté le {new Date(status.connected_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                )}
                <button onClick={disconnect} className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-sm font-medium transition-colors">
                  <LogOut className="w-4 h-4" />
                  Déconnecter
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <XCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Aucun compte connect\u00e9</p>
                <p className="text-xs text-gray-500 mt-1">Choisissez une méthode de connexion &agrave; droite</p>
              </div>
            )}
          </div>

          {/* Extension Chrome info */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="text-sm font-bold text-blue-900">Extension Chrome requise</span>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed">
              L&apos;extension LinkedIn Agent doit \u00eatre install\u00e9e et active dans Chrome pour que les actions LinkedIn fonctionnent. Le statut &quot;Connecté&quot; dans le popup de l&apos;extension confirme que tout est op\u00e9rationnel.
            </p>
          </div>
        </div>

        {/* Right column: Connection methods */}
        <div className="lg:col-span-2 space-y-6">
          {/* Method selection */}
          {!selectedMethod && (
            <div>
              <h2 className="text-base font-semibold text-gray-800 mb-4">
                {status?.connected ? "Changer de méthode de connexion" : "Choisir une méthode de connexion"}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cookie Method */}
                <button
                  onClick={() => { setSelectedMethod("cookie"); setError(""); setSuccess(""); }}
                  className="group flex flex-col items-center gap-4 p-6 border-2 border-gray-200 hover:border-orange-400 bg-white hover:bg-orange-50 rounded-2xl transition-all text-center"
                >
                  <div className="w-14 h-14 bg-orange-100 group-hover:bg-orange-200 rounded-2xl flex items-center justify-center transition-colors">
                    <Cookie className="w-7 h-7 text-orange-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Via Cookie</div>
                    <div className="text-xs text-gray-500 mt-1">Copier le cookie li_at depuis votre navigateur</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Shield className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-green-600 font-medium">Recommandé</span>
                  </div>
                </button>

                {/* OAuth Method */}
                <button
                  onClick={() => { setSelectedMethod("oauth"); setError(""); setSuccess(""); }}
                  className="group flex flex-col items-center gap-4 p-6 border-2 border-gray-200 hover:border-purple-400 bg-white hover:bg-purple-50 rounded-2xl transition-all text-center"
                >
                  <div className="w-14 h-14 bg-purple-100 group-hover:bg-purple-200 rounded-2xl flex items-center justify-center transition-colors">
                    <ExternalLink className="w-7 h-7 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Via OAuth</div>
                    <div className="text-xs text-gray-500 mt-1">L&apos;extension capture automatiquement votre session</div>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-blue-600 font-medium">Simple</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Cookie Method Form */}
          {selectedMethod === "cookie" && (
            <div className="border-2 border-orange-200 bg-orange-50 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cookie className="w-5 h-5 text-orange-600" />
                  <h3 className="font-bold text-gray-900">Connexion par Cookie li_at</h3>
                </div>
                <button onClick={() => setSelectedMethod(null)} className="text-gray-400 hover:text-gray-600 text-sm font-medium">\u2715 Annuler</button>
              </div>

              {/* Instructions */}
              <div className="bg-white rounded-xl border border-orange-200 p-4 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Comment trouver votre cookie li_at</span>
                  <button onClick={copyInstructions} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copi\u00e9!" : "Copier"}
                  </button>
                </div>
                <ol className="text-xs text-gray-600 space-y-2 list-none">
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>Ouvrez <strong>linkedin.com</strong> dans Chrome et connectez-vous</li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>Appuyez sur <strong>F12</strong> pour ouvrir les DevTools</li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>Allez dans l&apos;onglet <strong>Application</strong> &rarr; <strong>Cookies</strong> &rarr; <strong>linkedin.com</strong></li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>Trouvez <strong>li_at</strong> et copiez sa valeur</li>
                </ol>
              </div>

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cookie li_at <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      type={showCookie ? "text" : "password"}
                      value={cookieValue}
                      onChange={(e) => setCookieValue(e.target.value)}
                      placeholder="AQEDATxxxxxxxxxxxxxxx..."
                      className="w-full pr-10 pl-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 font-mono bg-white"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom (optionnel)</label>
                    <input
                      type="text"
                      value={cookieName}
                      onChange={(e) => setCookieName(e.target.value)}
                      placeholder="Jean Dupont"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email LinkedIn (optionnel)</label>
                    <input
                      type="email"
                      value={cookieEmail}
                      onChange={(e) => setCookieEmail(e.target.value)}
                      placeholder="jean@exemple.com"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                Le cookie est stock\u00e9 localement sur votre base de donn\u00e9es. Ne le partagez jamais avec des tiers.
              </div>

              <button
                onClick={connectViaCookie}
                disabled={saving || !cookieValue.trim()}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cookie className="w-4 h-4" />}
                {saving ? "Connexion en cours..." : "Connecter via Cookie"}
              </button>
            </div>
          )}

          {/* OAuth Method Form */}
          {selectedMethod === "oauth" && (
            <div className="border-2 border-purple-200 bg-purple-50 rounded-2xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-purple-600" />
                  <h3 className="font-bold text-gray-900">Connexion via OAuth / Extension</h3>
                </div>
                <button onClick={() => setSelectedMethod(null)} className="text-gray-400 hover:text-gray-600 text-sm font-medium">\u2715 Annuler</button>
              </div>

              <div className="bg-white rounded-xl border border-purple-200 p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Comment \u00e7a fonctionne</p>
                <ol className="text-xs text-gray-600 space-y-2 list-none">
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>Cliquez sur <strong>Activer la capture OAuth</strong></li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>L&apos;extension Chrome va d\u00e9tecter votre session LinkedIn</li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>Connectez-vous sur <strong>linkedin.com</strong> si ce n&apos;est pas d\u00e9j\u00e0 fait</li>
                  <li className="flex items-start gap-2"><span className="w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>L&apos;extension capturera automatiquement votre cookie de session</li>
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom (optionnel)</label>
                  <input
                    type="text"
                    value={cookieName}
                    onChange={(e) => setCookieName(e.target.value)}
                    placeholder="Jean Dupont"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email LinkedIn (optionnel)</label>
                  <input
                    type="email"
                    value={cookieEmail}
                    onChange={(e) => setCookieEmail(e.target.value)}
                    placeholder="jean@exemple.com"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-400 focus:border-purple-400 bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href="https://www.linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ouvrir LinkedIn
                </a>
                <button
                  onClick={connectViaOAuth}
                  disabled={saving}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {saving ? "Activation..." : "Activer la capture"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
