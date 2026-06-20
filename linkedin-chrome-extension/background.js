// Configuration — v3.1 (2026-04-22) — Détection automatique réponses inbox
console.log(
  "[Extension] ██████ background.js v3.1 chargé — INBOX REPLY DETECTION ██████"
);
const DEFAULT_API_BASE_URL = "http://localhost:3000/api";
let API_BASE_URL = DEFAULT_API_BASE_URL;

// Charger l'URL serveur depuis le storage au démarrage
chrome.storage.local
  .get(["serverUrl"])
  .then((result) => {
    if (result && result.serverUrl) {
      API_BASE_URL = result.serverUrl.replace(/\/$/, "") + "/api";
      console.log("[Config] Serveur configuré:", API_BASE_URL);
    }
  })
  .catch((err) => console.error("[Config] Erreur chargement serverUrl:", err));

// Écouter les changements de config
chrome.storage.onChanged.addListener((changes) => {
  if (changes.serverUrl) {
    API_BASE_URL =
      (
        changes.serverUrl.newValue || DEFAULT_API_BASE_URL.replace("/api", "")
      ).replace(/\/$/, "") + "/api";
    console.log("[Config] Serveur mis à jour:", API_BASE_URL);
  }
});
const POLL_INTERVAL_MS = 10000; // 10 secondes

// Délais sécurisés par type d'action (en ms) - fourchette [min, max]
const ACTION_DELAYS = {
  send_connection: [120000, 180000], // 2min à 3min
  send_message: [90000, 150000], // 1m30 à 2m30
  visit_profile: [20000, 40000], // 20s à 40s
  search: [45000, 70000], // 45s à 70s
  search_and_message: [45000, 70000], // même délai que search (les délais internes sont gérés dans la fonction)
  search_and_connection: [45000, 70000], // même délai que search (les délais internes sont gérés dans la fonction)
  default: [10000, 20000] // 10s à 20s
};

// Token JWT stocké (pour identification user secondaire ou admin)
let authToken = null;
chrome.storage.local
  .get(["authToken"])
  .then((result) => {
    if (result && result.authToken) {
      authToken = result.authToken;
      console.log("[Auth] Token JWT chargé depuis le storage");
    }
  })
  .catch((err) => console.error("[Auth] Erreur chargement authToken:", err));

// =============================================================
// Multi-admin SaaS : patch GLOBAL de fetch dans le service worker.
// -------------------------------------------------------------
// Toutes les requêtes vers API_BASE_URL doivent transporter le JWT
// pour que le backend sache à quel admin (ou user secondaire)
// elles appartiennent. On wrap fetch une seule fois ici plutôt que
// de modifier les ~30 appels existants.
// =============================================================
if (!globalThis.__authFetchPatched) {
  globalThis.__authFetchPatched = true;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init = {}) => {
    try {
      const url = typeof input === "string" ? input : input?.url || "";
      // On n'injecte le token que pour les appels vers NOTRE backend.
      // Cela évite de leaker le JWT vers linkedin.com ou tout autre site.
      const targetsOurApi =
        url.startsWith(API_BASE_URL) ||
        url.startsWith(DEFAULT_API_BASE_URL) ||
        url.includes("/api/");
      if (targetsOurApi && authToken) {
        const headers = new Headers(init.headers || {});
        if (!headers.has("Authorization")) {
          headers.set("Authorization", `Bearer ${authToken}`);
        }
        init = { ...init, headers };
      }
    } catch {
      // En cas d'erreur on laisse passer sans modification
    }
    return originalFetch(input, init);
  };
}

// Helper conservé pour rétro-compat (utilisé dans updateActionStatus)
async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return fetch(url, { ...options, headers });
}

// Settings utilisateur chargés depuis le backend
let agentSettings = {
  minDelayBetweenActions: 30,
  maxDelayBetweenActions: 120,
  randomizeDelays: true,
  simulateHumanBehavior: true,
  autoReplyEnabled: false,
  workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  workingHoursStart: "09:00",
  workingHoursEnd: "18:00",
  tone: "professional",
  autoDetectLanguage: true
};

async function loadAgentSettings() {
  try {
    const res = await fetch(`${API_BASE_URL}/settings/agent`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.settings) {
      agentSettings = { ...agentSettings, ...data.settings };
      console.log("[Settings] Paramètres agent chargés:", agentSettings);
    }
  } catch (e) {
    console.log(
      "[Settings] Impossible de charger les paramètres agent:",
      e.message
    );
  }
}

// Charger les settings au démarrage et toutes les 5 minutes
setTimeout(loadAgentSettings, 2000);
setInterval(loadAgentSettings, 5 * 60 * 1000);

// Limites journalières LinkedIn (conservatives)
const DAILY_LIMITS = {
  send_connection: 20,
  send_message: 30,
  visit_profile: 50,
  search: 25,
  search_and_message: 15,
  search_and_connection: 20
};

// Compteurs journaliers — réinitialisés à minuit
let dailyCounters = {};
let lastResetDate = new Date().toDateString();

function getRandomDelay(actionType) {
  // Pour send_message et send_connection, utiliser les délais configurés par l'utilisateur
  if (
    actionType === "send_message" ||
    actionType === "send_connection" ||
    actionType === "default"
  ) {
    const minMs = (agentSettings.minDelayBetweenActions || 30) * 1000;
    const maxMs = (agentSettings.maxDelayBetweenActions || 120) * 1000;
    if (!agentSettings.randomizeDelays) return minMs;
    return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  }
  const [min, max] = ACTION_DELAYS[actionType] || ACTION_DELAYS.default;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resetDailyCountersIfNeeded() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyCounters = {};
    lastResetDate = today;
    console.log("[LinkedIn Guard] Compteurs journaliers réinitialisés.");
  }
}

function isLimitReached(actionType) {
  resetDailyCountersIfNeeded();
  const limit = DAILY_LIMITS[actionType];
  if (!limit) return false;
  const count = dailyCounters[actionType] || 0;
  if (count >= limit) {
    console.warn(
      `[LinkedIn Guard] Limite journalière atteinte pour "${actionType}" (${count}/${limit}). Action ignorée.`
    );
    return true;
  }
  return false;
}

function incrementCounter(actionType) {
  dailyCounters[actionType] = (dailyCounters[actionType] || 0) + 1;
  console.log(
    `[LinkedIn Guard] ${actionType}: ${dailyCounters[actionType]}/${DAILY_LIMITS[actionType] || "∞"} aujourd'hui.`
  );
}

let isProcessing = false;
let isConnected = false;
let activeActionTabId = null; // onglet ouvert pour l'action en cours
let searchAndMessageActionIds = new Set(); // IDs des actions search_and_message en cours (le listener global ne doit PAS les traiter)
let searchAndConnectionActionIds = new Set(); // IDs des actions search_and_connection en cours (le listener global ne doit PAS les traiter)

// Initialiser l'alarme de polling
chrome.alarms.create("pollActions", { periodInMinutes: 0.2 }); // Toutes les 12 secondes

// Alarme pour détecter les actions bloquées en "processing" depuis trop longtemps
chrome.alarms.create("recoverStaleActions", { periodInMinutes: 2 }); // Toutes les 2 minutes

// Alarme pour vérifier les réponses dans la messagerie LinkedIn
chrome.alarms.create("checkInboxReplies", {
  delayInMinutes: 0.5,
  periodInMinutes: 5
}); // 1ère fois après 30s, puis toutes les 5 min
let isCheckingInbox = false;

// Alarme pour vérifier les connexions acceptées (page Mon Réseau — fallback)
chrome.alarms.create("checkAcceptedConnections", {
  delayInMinutes: 1,
  periodInMinutes: 5
}); // 1ère fois après 1 min, puis toutes les 5 min
let isCheckingConnections = false;

// Alarme rapide — vérification ciblée profil par profil toutes les 2 min
chrome.alarms.create("checkPendingConnectionsFast", {
  delayInMinutes: 0.5,
  periodInMinutes: 2
}); // 1ère fois après 30s, puis toutes les 2 min
let isCheckingPendingFast = false;

// Vérification immédiate au démarrage (après 10s pour laisser LinkedIn se charger)
setTimeout(() => {
  if (!isCheckingInbox && !isProcessing) {
    console.log("[INBOX] 🚀 Vérification initiale au démarrage...");
    checkInboxForReplies();
  }
}, 10000);

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "pollActions") {
    console.log(`[ALARM] pollActions déclenché — isProcessing=${isProcessing}`);
    if (!isProcessing) {
      await pollAndExecuteActions();
    }
  }

  // Récupération des actions bloquées en "processing" depuis > 5 minutes
  if (alarm.name === "recoverStaleActions") {
    try {
      const resp = await fetch(
        `${API_BASE_URL}/linkedin-actions?status=processing&limit=10`
      );
      if (!resp.ok) return;
      const data = await resp.json();
      const now = Date.now();
      for (const action of data.actions || []) {
        // Ne PAS récupérer les actions qui attendent d'être reprises (continue)
        const result =
          typeof action.result === "string"
            ? JSON.parse(action.result || "{}")
            : action.result || {};
        if (result.last_action === "continue") {
          continue; // En attente de reprise par le polling — ne pas toucher
        }
        // Ne pas récupérer les actions en cours d'exécution
        if (
          searchAndMessageActionIds.has(action.id) ||
          searchAndConnectionActionIds.has(action.id)
        ) {
          continue;
        }
        const updatedAt = action.executed_at || action.created_at;
        const age = now - new Date(updatedAt).getTime();
        // Si l'action est en "processing" depuis plus de 5 minutes, la marquer comme terminée
        if (age > 5 * 60 * 1000) {
          console.warn(
            `[RECOVERY] Action #${action.id} bloquée en "processing" depuis ${Math.round(age / 60000)} min — forçage "completed"`
          );
          await updateActionStatus(action.id, "completed", {
            recovered: true,
            message: `Action récupérée automatiquement après ${Math.round(age / 60000)} min en processing`
          });
        }
      }
    } catch (e) {
      // Silencieux — pas critique
    }
  }

  // Vérifier les réponses dans la messagerie LinkedIn
  if (alarm.name === "checkInboxReplies") {
    if (!isCheckingInbox && !isProcessing) {
      await checkInboxForReplies();
    }
  }

  // Vérifier les connexions acceptées (fallback réseau)
  if (alarm.name === "checkAcceptedConnections") {
    if (
      !isCheckingConnections &&
      !isProcessing &&
      !isCheckingInbox &&
      !isCheckingPendingFast
    ) {
      await checkAcceptedConnections();
    }
  }

  // Vérification rapide ciblée profil par profil
  if (alarm.name === "checkPendingConnectionsFast") {
    if (!isCheckingPendingFast && !isProcessing && !isCheckingConnections) {
      await checkPendingConnectionsFast();
    }
  }
});

// =============================================
// VÉRIFICATION INBOX — Détecter les réponses automatiquement
// =============================================
async function checkInboxForReplies() {
  isCheckingInbox = true;
  console.log(
    "[INBOX] 📬 Vérification des réponses dans la messagerie LinkedIn..."
  );

  let inboxTab = null;
  try {
    // D'abord récupérer les prospects en statut "contacted" depuis l'API
    const prospectsRes = await fetch(
      `${API_BASE_URL}/prospects?status=contacted&limit=100`
    );
    const prospectsData = await prospectsRes.json();

    if (
      !prospectsData.success ||
      !prospectsData.prospects ||
      prospectsData.prospects.length === 0
    ) {
      console.log(
        "[INBOX] Aucun prospect en statut 'contacted' — rien à vérifier"
      );
      isCheckingInbox = false;
      return;
    }

    const contactedProspects = prospectsData.prospects;
    console.log(
      `[INBOX] ${contactedProspects.length} prospects contactés à surveiller:`,
      contactedProspects.map((p) => p.name).join(", ")
    );

    // Ouvrir la messagerie LinkedIn dans un onglet en arrière-plan
    inboxTab = await new Promise((resolve, reject) => {
      chrome.tabs.create(
        { url: "https://www.linkedin.com/messaging/", active: false },
        (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tab);
          }
        }
      );
    });

    // Attendre le chargement de la page
    await new Promise((resolve) => {
      function onUpdated(tabId, changeInfo) {
        if (tabId === inboxTab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }
      }
      chrome.tabs.onUpdated.addListener(onUpdated);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }, 15000);
    });

    await delay(3000); // Attendre le rendu JS

    // Injecter le content script si nécessaire
    await ensureContentScript(inboxTab.id);
    await delay(1000);

    // Demander au content script de scraper l'inbox
    const replies = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(inboxListener);
        resolve([]);
      }, 15000);

      function inboxListener(message, sender) {
        if (
          message.type === "INBOX_REPLIES" &&
          sender.tab?.id === inboxTab.id
        ) {
          clearTimeout(timeout);
          chrome.runtime.onMessage.removeListener(inboxListener);
          resolve(message.data || []);
          return true;
        }
      }
      chrome.runtime.onMessage.addListener(inboxListener);

      chrome.tabs.sendMessage(
        inboxTab.id,
        {
          type: "SCRAPE_INBOX",
          contactedProspects: contactedProspects.map((p) => ({
            id: p.id,
            name: p.name,
            linkedin_url: p.linkedin_url
          }))
        },
        (resp) => {
          if (chrome.runtime.lastError) {
            clearTimeout(timeout);
            chrome.runtime.onMessage.removeListener(inboxListener);
            console.log(
              "[INBOX] ⚠️ Erreur envoi SCRAPE_INBOX:",
              chrome.runtime.lastError.message
            );
            resolve([]);
          }
        }
      );
    });

    console.log(
      `[INBOX] ${replies.length} réponses confirmées par le content script`
    );

    // Le content script a déjà matché par nom → il retourne prospect_id directement
    let updated = 0;
    for (const reply of replies) {
      const prospectId = reply.prospect_id;
      if (!prospectId) {
        console.log(
          `[INBOX] ⚠️ Réponse de "${reply.name}" sans prospect_id — ignorée`
        );
        continue;
      }

      console.log(
        `[INBOX] ✅ "${reply.name}" a répondu → mise à jour prospect #${prospectId}`
      );
      try {
        const updateRes = await fetch(
          `${API_BASE_URL}/prospects/update-status`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prospect_id: prospectId,
              status: "responded"
            })
          }
        );
        const updateData = await updateRes.json();
        if (updateRes.ok && updateData.success) {
          updated++;
          console.log(
            `[INBOX] 📊 Prospect #${prospectId} "${reply.name}" → statut "responded"`
          );

          // Mettre à jour les stats campagne (replied) si le prospect est lié à une campagne
          try {
            const campaignStatsRes = await fetch(
              `${API_BASE_URL}/campaigns/update-stats`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prospect_id: prospectId,
                  stat: "replied"
                })
              }
            );
            if (campaignStatsRes.ok) {
              const statsData = await campaignStatsRes.json();
              if (statsData.updated_campaigns?.length > 0) {
                console.log(
                  `[INBOX] 📈 Campagne(s) mise(s) à jour: ${statsData.updated_campaigns.join(", ")}`
                );
              }
            }
          } catch (statsErr) {
            console.log(
              `[INBOX] ⚠️ Erreur mise à jour stats campagne: ${statsErr.message}`
            );
          }

          // AUTO-REPLY: si activé dans les paramètres, générer et envoyer une réponse automatique
          if (agentSettings.autoReplyEnabled) {
            try {
              console.log(
                `[AUTO-REPLY] 🤖 Réponse automatique pour "${reply.name}"...`
              );
              const autoReplyRes = await fetch(`${API_BASE_URL}/auto-reply`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  prospect_id: prospectId,
                  prospect_name: reply.name,
                  prospect_url: reply.linkedin_url || null,
                  prospect_message: reply.message || reply.last_message || ""
                })
              });
              const autoReplyData = await autoReplyRes.json();
              if (autoReplyData.success && !autoReplyData.skipped) {
                console.log(
                  `[AUTO-REPLY] ✅ Réponse créée pour "${reply.name}" — Action #${autoReplyData.action_id}`
                );
              } else if (autoReplyData.skipped) {
                console.log(`[AUTO-REPLY] ⏭️ Ignoré: ${autoReplyData.reason}`);
              }
            } catch (arErr) {
              console.log(`[AUTO-REPLY] ⚠️ Erreur: ${arErr.message}`);
            }
          }
        } else {
          console.log(`[INBOX] ⚠️ Erreur API: ${JSON.stringify(updateData)}`);
        }
      } catch (e) {
        console.log(`[INBOX] ⚠️ Erreur mise à jour: ${e.message}`);
      }
    }

    console.log(
      `[INBOX] 📬 Vérification terminée — ${updated} prospects mis à jour en "responded"`
    );
  } catch (error) {
    console.error("[INBOX] Erreur vérification inbox:", error.message);
  } finally {
    // Fermer l'onglet inbox
    if (inboxTab?.id) {
      chrome.tabs.remove(inboxTab.id).catch(() => {});
    }
    isCheckingInbox = false;
  }
}

// Helper global: normaliser une URL LinkedIn en chemin /in/xxx
function normalizeLinkedInUrl(url) {
  if (!url) return null;
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\/in\/[^/?#]+/);
    return m ? m[0].toLowerCase().replace(/\/$/, "") : null;
  } catch {
    const m = String(url).match(/\/in\/[^/?#]+/);
    return m ? m[0].toLowerCase().replace(/\/$/, "") : null;
  }
}

// =============================================
// VÉRIFICATION RAPIDE — profil par profil (toutes les 2 min)
// =============================================
async function checkPendingConnectionsFast() {
  isCheckingPendingFast = true;
  console.log(
    "[FAST-CONN] 🔍 Vérification rapide des connexions en attente..."
  );

  try {
    // 1. Récupérer les actions send_connection complétées
    const actionsRes = await fetch(
      `${API_BASE_URL}/linkedin-actions?status=completed&limit=200`
    );
    const actionsData = await actionsRes.json();
    if (!actionsData.success || !Array.isArray(actionsData.actions)) {
      isCheckingPendingFast = false;
      return;
    }

    // Construire ensembles d'URLs et noms pour matching
    const pendingUrls = new Set();
    const pendingNames = new Set();
    for (const act of actionsData.actions) {
      const result =
        typeof act.result === "string"
          ? (() => {
              try {
                return JSON.parse(act.result);
              } catch {
                return null;
              }
            })()
          : act.result;

      // 1) send_connection direct
      if (act.action_type === "send_connection" && result?.sent) {
        if (act.target_url) {
          const u = normalizeLinkedInUrl(act.target_url);
          if (u) pendingUrls.add(u);
        }
        if (act.target_name)
          pendingNames.add(act.target_name.toLowerCase().trim());
      }

      // 2) search_and_connection (campagnes) — sent_profiles[]
      if (
        act.action_type === "search_and_connection" &&
        Array.isArray(result?.sent_profiles)
      ) {
        for (const item of result.sent_profiles) {
          if (!item) continue;
          if (typeof item === "object") {
            if (item.url) {
              const u = normalizeLinkedInUrl(item.url);
              if (u) pendingUrls.add(u);
            }
            if (item.name) pendingNames.add(item.name.toLowerCase().trim());
          } else if (typeof item === "string") {
            pendingNames.add(item.toLowerCase().trim());
          }
        }
      }
    }

    if (pendingUrls.size === 0 && pendingNames.size === 0) {
      console.log("[FAST-CONN] Aucune demande de connexion envoyée trouvée");
      isCheckingPendingFast = false;
      return;
    }

    console.log(
      `[FAST-CONN] ${pendingUrls.size} URLs + ${pendingNames.size} noms en attente`
    );

    // 2. Récupérer TOUS les prospects (on filtrera par status après)
    const prospectsRes = await fetch(`${API_BASE_URL}/prospects?limit=200`);
    const prospectsData = await prospectsRes.json();
    if (!prospectsData.success || !prospectsData.prospects?.length) {
      isCheckingPendingFast = false;
      return;
    }

    // 3. Filtrer prospects 'identified' qui matchent une connexion envoyée
    const toCheck = [];
    const skipped = []; // diagnostic
    const newProspects = prospectsData.prospects.filter(
      (p) => p.status === "identified"
    );
    console.log(
      `[FAST-CONN] ${newProspects.length} prospect(s) en status 'identified'`
    );

    for (const p of newProspects) {
      if (!p.linkedin_url) {
        skipped.push(`❌ ${p.name} — pas de linkedin_url`);
        continue;
      }

      const normP = normalizeLinkedInUrl(p.linkedin_url);
      const nameKey = (p.name || "").toLowerCase().trim();

      const matchByUrl = normP && pendingUrls.has(normP);
      const matchByName = nameKey && pendingNames.has(nameKey);

      if (matchByUrl || matchByName) {
        const reason = matchByUrl ? "URL" : "nom";
        console.log(
          `[FAST-CONN] ✓ ${p.name} matché par ${reason} → à vérifier`
        );
        toCheck.push({ id: p.id, name: p.name, linkedin_url: p.linkedin_url });
        if (toCheck.length >= 3) break;
      } else {
        skipped.push(
          `❌ ${p.name} (${normP || "url invalide"}) — aucune action send_connection trouvée`
        );
      }
    }

    if (skipped.length > 0) {
      console.log("[FAST-CONN] Prospects ignorés:");
      skipped.forEach((s) => console.log("  " + s));
    }

    if (toCheck.length === 0) {
      console.log(
        "[FAST-CONN] Aucun prospect 'identified' avec connexion en attente"
      );
      isCheckingPendingFast = false;
      return;
    }

    console.log(
      `[FAST-CONN] ${toCheck.length} profil(s) à vérifier: ${toCheck.map((p) => p.name).join(", ")}`
    );

    // 4. Visiter chaque profil et vérifier le degré
    for (const prospect of toCheck) {
      let tab = null;
      try {
        tab = await new Promise((resolve, reject) => {
          chrome.tabs.create(
            { url: prospect.linkedin_url, active: false },
            (t) => {
              if (chrome.runtime.lastError)
                reject(new Error(chrome.runtime.lastError.message));
              else resolve(t);
            }
          );
        });

        // Attendre chargement
        await new Promise((resolve) => {
          function onUpdated(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === "complete") {
              chrome.tabs.onUpdated.removeListener(onUpdated);
              resolve();
            }
          }
          chrome.tabs.onUpdated.addListener(onUpdated);
          setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            resolve();
          }, 12000);
        });
        await delay(2500);

        // Injecter et détecter le degré de connexion
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            function wait(ms) {
              return new Promise((r) => setTimeout(r, ms));
            }
            function detectDegree() {
              // Méthode 1: badge de degré
              for (const el of document.querySelectorAll("span, .dist-value")) {
                const t = (el.textContent || "").trim();
                if (/^1(er|st|°)?(\s*(degré|degree))?$/i.test(t)) return 1;
                if (/^2(e|nd|°)?(\s*(degré|degree))?$/i.test(t)) return 2;
              }
              // Méthode 2: aria-label
              for (const el of document.querySelectorAll("[aria-label]")) {
                const label = (
                  el.getAttribute("aria-label") || ""
                ).toLowerCase();
                if (label.includes("1st degree") || label.includes("1er"))
                  return 1;
                if (label.includes("2nd degree") || label.includes("2e"))
                  return 2;
              }
              // Méthode 3: bouton "Message" = 1er degré
              for (const btn of document.querySelectorAll(
                "button, a[role='button']"
              )) {
                const txt = (btn.textContent || "").trim().toLowerCase();
                if (txt === "message" || txt === "envoyer un message") return 1;
              }
              // Méthode 4: bouton "Se connecter" = pas encore connecté
              for (const btn of document.querySelectorAll(
                "button, a[role='button']"
              )) {
                const txt = (btn.textContent || "").trim().toLowerCase();
                if (txt === "se connecter" || txt === "connect") return 2;
              }
              return null;
            }

            // Attendre le chargement du profil
            for (let i = 0; i < 15; i++) {
              const h1 = document.querySelector("h1");
              if (h1 && h1.textContent.trim().length > 0) break;
              await wait(500);
            }
            let degree = null;
            for (let attempt = 0; attempt < 6; attempt++) {
              degree = detectDegree();
              if (degree !== null) break;
              await wait(800);
            }
            return { degree: degree || 0, connected: degree === 1 };
          }
        });

        const res = results?.[0]?.result;
        console.log(
          `[FAST-CONN] ${prospect.name} → degré ${res?.degree ?? "?"}`
        );

        if (res?.connected) {
          console.log(
            `[FAST-CONN] ✅ ${prospect.name} a accepté la connexion !`
          );
          await fetch(`${API_BASE_URL}/prospects/${prospect.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "connected" })
          });
          // Mettre à jour les stats campagne
          try {
            await fetch(`${API_BASE_URL}/campaigns/update-stats`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prospect_id: prospect.id,
                stat: "connections_accepted"
              })
            });
          } catch (e) {}
        }
      } catch (e) {
        console.log(`[FAST-CONN] Erreur pour ${prospect.name}: ${e.message}`);
      } finally {
        if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
      }

      // Pause entre profils pour ne pas surcharger LinkedIn
      await delay(2000);
    }

    console.log("[FAST-CONN] ✅ Vérification rapide terminée");
  } catch (error) {
    console.error("[FAST-CONN] Erreur:", error.message);
  } finally {
    isCheckingPendingFast = false;
  }
}

// =============================================
// VÉRIFICATION CONNEXIONS ACCEPTÉES
// =============================================
async function checkAcceptedConnections() {
  isCheckingConnections = true;
  console.log("[CONNECTIONS] 🔍 Vérification des connexions acceptées...");

  let networkTab = null;
  try {
    // 1) Récupérer les profils envoyés via search_and_connection (campagnes)
    //    sent_profiles est maintenant [{name, url, id}] (ou anciennement [string])
    const sentProspects = []; // {name, url, id}
    const sentUrls = new Set();
    const sentNames = new Set(); // fallback pour l'ancien format
    try {
      const actionsRes = await fetch(
        `${API_BASE_URL}/linkedin-actions?status=completed&limit=200`
      );
      const actionsData = await actionsRes.json();
      if (actionsData.success && Array.isArray(actionsData.actions)) {
        for (const act of actionsData.actions) {
          const result =
            typeof act.result === "string"
              ? (() => {
                  try {
                    return JSON.parse(act.result);
                  } catch {
                    return null;
                  }
                })()
              : act.result;

          // Connexions directes (send_connection) — target_url + target_name
          if (act.action_type === "send_connection" && result?.sent) {
            const url = act.target_url || null;
            const name = (act.target_name || "").toLowerCase().trim();
            const key = url || name;
            if (key && !sentUrls.has(key)) {
              sentUrls.add(key);
              sentProspects.push({ name, url, id: null });
              if (name) sentNames.add(name);
            }
            continue;
          }

          // Connexions via campagne (search_and_connection) — sent_profiles[]
          if (act.action_type !== "search_and_connection") continue;
          if (result?.sent_profiles && Array.isArray(result.sent_profiles)) {
            for (const item of result.sent_profiles) {
              if (!item) continue;
              if (typeof item === "object") {
                const key = item.url || item.name || "";
                if (key && !sentUrls.has(key)) {
                  sentUrls.add(key);
                  sentProspects.push(item);
                  if (item.name) sentNames.add(item.name.toLowerCase().trim());
                }
              } else if (typeof item === "string") {
                const name = item.toLowerCase().trim();
                if (!sentNames.has(name)) {
                  sentNames.add(name);
                  sentProspects.push({ name, url: null, id: null });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.log("[CONNECTIONS] Erreur fetch actions:", e.message);
    }
    console.log(
      `[CONNECTIONS] ${sentProspects.length} profils envoyés trouvés dans les actions`
    );

    // 2) Récupérer les prospects à vérifier:
    //    - Tous les prospects 'identified' dont le nom est dans sentNames (campagne)
    //    - Plus les prospects 'contacted' (anciennes demandes de connexion directes)
    const prospectsRes = await fetch(`${API_BASE_URL}/prospects?limit=200`);
    const prospectsData = await prospectsRes.json();

    if (
      !prospectsData.success ||
      !prospectsData.prospects ||
      prospectsData.prospects.length === 0
    ) {
      console.log("[CONNECTIONS] Aucun prospect à vérifier");
      isCheckingConnections = false;
      return;
    }

    // IDs des prospects dont on a envoyé une connexion (source la plus fiable)
    const sentProspectIds = new Set(
      sentProspects.filter((sp) => sp.id).map((sp) => Number(sp.id))
    );
    // URLs LinkedIn des prospects dont on a envoyé une connexion
    const sentProspectUrls = new Set(
      sentProspects
        .filter((sp) => sp.url)
        .map((sp) => normalizeLinkedInUrl(sp.url))
    );

    const contactedProspects = prospectsData.prospects.filter((p) => {
      if (p.status === "contacted") return true;
      if (p.status === "identified" || p.status === "connected") {
        // 1. Match par ID (le plus fiable)
        if (p.id && sentProspectIds.has(Number(p.id))) return true;
        // 2. Match par URL LinkedIn
        if (
          p.linkedin_url &&
          sentProspectUrls.has(normalizeLinkedInUrl(p.linkedin_url))
        )
          return true;
        // 3. Match par nom (fallback)
        if (p.name && sentNames.has(p.name.toLowerCase().trim())) return true;
      }
      return false;
    });

    if (contactedProspects.length === 0) {
      console.log(
        "[CONNECTIONS] Aucun prospect avec demande de connexion en attente"
      );
      isCheckingConnections = false;
      return;
    }

    console.log(
      `[CONNECTIONS] ${contactedProspects.length} prospects à vérifier`
    );

    // Ouvrir la page "Mon réseau" de LinkedIn pour voir les connexions récentes
    networkTab = await new Promise((resolve, reject) => {
      chrome.tabs.create(
        {
          url: "https://www.linkedin.com/mynetwork/invite-connect/connections/",
          active: false
        },
        (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(tab);
          }
        }
      );
    });

    // Attendre le chargement
    await new Promise((resolve) => {
      function onUpdated(tabId, changeInfo) {
        if (tabId === networkTab.id && changeInfo.status === "complete") {
          chrome.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }
      }
      chrome.tabs.onUpdated.addListener(onUpdated);
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }, 15000);
    });

    await delay(3000);

    // Scraper les connexions récentes (nom + URL)
    const results = await chrome.scripting.executeScript({
      target: { tabId: networkTab.id },
      func: () => {
        const connections = [];
        const seenUrls = new Set();

        const normUrl = (href) => {
          try {
            const path = new URL(href).pathname;
            const m = path.match(/\/in\/[^/?#]+/);
            return m ? m[0].toLowerCase().replace(/\/$/, "") : null;
          } catch {
            return null;
          }
        };

        const pushConn = (name, url) => {
          const key = url || name;
          if (!key || seenUrls.has(key)) return;
          seenUrls.add(key);
          if (name && name.length > 1)
            connections.push({
              name: name.replace(/\s+/g, " ").trim().toLowerCase(),
              url
            });
        };

        // Stratégie 1: cartes de connexion standard LinkedIn
        document.querySelectorAll(".mn-connection-card").forEach((card) => {
          const nameEl =
            card.querySelector(".mn-connection-card__name") ||
            card.querySelector(".artdeco-entity-lockup__title");
          const linkEl = card.querySelector("a[href*='/in/']");
          if (nameEl)
            pushConn(nameEl.textContent, linkEl ? normUrl(linkEl.href) : null);
        });

        // Stratégie 2: items de liste avec lockup entity
        if (connections.length === 0) {
          document.querySelectorAll(".artdeco-list__item").forEach((item) => {
            const linkEl = item.querySelector("a[href*='/in/']");
            if (!linkEl) return;
            const url = normUrl(linkEl.href);
            const titleEl = item.querySelector(".artdeco-entity-lockup__title");
            const nameEl =
              (titleEl && titleEl.querySelector("span:first-child")) ||
              linkEl.querySelector("span[aria-hidden='true']") ||
              titleEl;
            if (nameEl) pushConn(nameEl.textContent, url);
          });
        }

        // Stratégie 3: tout lien /in/ sur la page avec un span de nom visible
        if (connections.length === 0) {
          document.querySelectorAll("a[href*='/in/']").forEach((link) => {
            if (link.closest("nav, header, footer, [class*='nav']")) return;
            const url = normUrl(link.href);
            if (!url) return;
            // Chercher le span de nom le plus pertinent
            const spans = Array.from(link.querySelectorAll("span"));
            const nameSpan = spans.find(
              (s) =>
                s.textContent.trim().length > 1 &&
                s.textContent.trim().length < 80 &&
                !/^\d+$/.test(s.textContent.trim())
            );
            if (nameSpan) pushConn(nameSpan.textContent, url);
          });
        }

        // Stratégie 4: data-member-id ou attributs LinkedIn spécifiques
        if (connections.length === 0) {
          document
            .querySelectorAll("[data-member-id], [data-urn*='member']")
            .forEach((el) => {
              const linkEl =
                el.querySelector("a[href*='/in/']") ||
                (el.tagName === "A" ? el : null);
              const url = linkEl ? normUrl(linkEl.href) : null;
              const nameEl = el.querySelector(
                ".name, [class*='name'], .t-16, .t-bold"
              );
              if (nameEl) pushConn(nameEl.textContent, url);
            });
        }

        return connections;
      }
    });

    const recentConnections = results?.[0]?.result || [];
    console.log(
      `[CONNECTIONS] ${recentConnections.length} connexions trouvées sur la page LinkedIn`
    );
    if (recentConnections.length > 0) {
      console.log("[CONNECTIONS] Exemples:", recentConnections.slice(0, 3));
    }

    // Helper: tokenize a name (strip accents, periods, punctuation; lowercase)
    const tokenize = (s) =>
      String(s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // strip accents
        .replace(/[.,;:!?'"()\[\]]/g, " ") // strip punctuation
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .filter(Boolean);

    // Helper: matches "Cyril P." → "Cyril Pradal" (token-by-token prefix match)
    // prospect tokens must each be a prefix of corresponding conn token, in same order
    const namesMatch = (prospectName, connName) => {
      const pt = tokenize(prospectName);
      const ct = tokenize(connName);
      if (pt.length === 0 || ct.length === 0) return false;
      // Try direct includes first (full match)
      const ptStr = pt.join(" ");
      const ctStr = ct.join(" ");
      if (ctStr.includes(ptStr) || ptStr.includes(ctStr)) return true;
      // Match by first+last token prefix (handles "Cyril P." vs "Cyril Pradal")
      // First name must match exactly, last initial must be prefix of last name
      if (pt.length >= 2 && ct.length >= 2) {
        const pFirst = pt[0];
        const pLast = pt[pt.length - 1];
        const cFirst = ct[0];
        const cLast = ct[ct.length - 1];
        if (pFirst === cFirst && cLast.startsWith(pLast)) return true;
        if (pFirst === cFirst && pLast.startsWith(cLast)) return true;
      }
      return false;
    };

    // Comparer chaque prospect avec les connexions récentes
    let accepted = 0;
    for (const prospect of contactedProspects) {
      const prospectName = (prospect.name || "").toLowerCase().trim();
      if (!prospectName) continue;

      const prospectUrl = normalizeLinkedInUrl(prospect.linkedin_url);
      const sentEntry = sentProspects.find(
        (sp) => sp.id && Number(sp.id) === Number(prospect.id)
      );
      const sentUrl = normalizeLinkedInUrl(sentEntry?.url);

      const isConnected = recentConnections.some((conn) => {
        if (conn.url) {
          if (prospectUrl && conn.url === prospectUrl) return true;
          if (sentUrl && conn.url === sentUrl) return true;
        }
        return namesMatch(prospectName, conn.name || "");
      });

      if (isConnected) {
        console.log(
          `[CONNECTIONS] ✅ ${prospect.name} a accepté la connexion !`
        );
        accepted++;

        try {
          await fetch(`${API_BASE_URL}/prospects/${prospect.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "connected" })
          });
        } catch (e) {
          console.log(
            `[CONNECTIONS] Erreur mise à jour prospect: ${e.message}`
          );
        }

        try {
          await fetch(`${API_BASE_URL}/campaigns/update-stats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prospect_id: prospect.id,
              stat: "connections_accepted"
            })
          });
        } catch (e) {
          console.log(`[CONNECTIONS] Erreur update stats: ${e.message}`);
        }
      }
    }

    console.log(
      `[CONNECTIONS] ✅ Vérification terminée — ${accepted} connexions acceptées détectées`
    );
  } catch (error) {
    console.error(
      "[CONNECTIONS] Erreur vérification connexions:",
      error.message
    );
  } finally {
    if (networkTab?.id) {
      chrome.tabs.remove(networkTab.id).catch(() => {});
    }
    isCheckingConnections = false;
  }
}

// Écouter les messages du popup et content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "KEEP_ALIVE") {
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "GET_STATUS") {
    sendResponse({ isProcessing, isConnected });
    return true;
  }

  if (message.type === "SET_AUTH_TOKEN") {
    authToken = message.token || null;
    if (authToken) {
      chrome.storage.local.set({ authToken });
      console.log("[Auth] Token JWT stocké dans l'extension");
    } else {
      chrome.storage.local.remove("authToken");
      console.log("[Auth] Token JWT supprimé");
    }
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "CHECK_PENDING_CONNECTIONS") {
    checkPendingConnectionsFast().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "MANUAL_POLL") {
    pollAndExecuteActions().then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "PROFILE_DATA") {
    // Données de profil envoyées par le content script après visite
    handleProfileData(message.data, message.actionId).then(() => {
      sendResponse({ success: true });
      // Fermer l'onglet après scraping du profil
      if (activeActionTabId) {
        setTimeout(() => {
          chrome.tabs.remove(activeActionTabId).catch(() => {});
          activeActionTabId = null;
        }, 1500);
      }
    });
    return true;
  }

  if (message.type === "SEARCH_RESULTS") {
    // Si c'est une action search_and_message, le listener local dans executeSearchAndMessage gère déjà
    if (
      searchAndMessageActionIds.has(message.actionId) ||
      searchAndConnectionActionIds.has(message.actionId)
    ) {
      console.log(
        "[Extension] SEARCH_RESULTS pour search_and_message #" +
          message.actionId +
          " — ignoré par listener global (géré localement)"
      );
      return false;
    }
    // Résultats de recherche envoyés par le content script (action search classique)
    handleSearchResults(message.data, message.actionId).then(() => {
      sendResponse({ success: true });
      // Fermer l'onglet après scraping des résultats de recherche
      if (activeActionTabId) {
        setTimeout(() => {
          chrome.tabs.remove(activeActionTabId).catch(() => {});
          activeActionTabId = null;
        }, 2000);
      }
    });
    return true;
  }

  if (message.type === "ACTION_COMPLETED") {
    updateActionStatus(message.actionId, "completed", message.result).then(
      () => {
        sendResponse({ success: true });
        // Fermer l'onglet action après succès
        if (activeActionTabId) {
          setTimeout(() => {
            chrome.tabs.remove(activeActionTabId).catch(() => {});
            activeActionTabId = null;
          }, 1500);
        }
      }
    );
    return true;
  }

  if (message.type === "ACTION_FAILED") {
    // Si c'est une action search_and_message, le listener local gère déjà
    if (
      searchAndMessageActionIds.has(message.actionId) ||
      searchAndConnectionActionIds.has(message.actionId)
    ) {
      console.log(
        "[Extension] ACTION_FAILED pour search_and_message #" +
          message.actionId +
          " — ignoré par listener global"
      );
      return false;
    }
    updateActionStatus(message.actionId, "failed", null, message.error).then(
      () => {
        sendResponse({ success: true });
        // Fermer l'onglet action après échec
        if (activeActionTabId) {
          setTimeout(() => {
            chrome.tabs.remove(activeActionTabId).catch(() => {});
            activeActionTabId = null;
          }, 1500);
        }
      }
    );
    return true;
  }

  if (message.type === "CAPTURE_LINKEDIN_COOKIE") {
    captureLinkedInCookie()
      .then((result) => sendResponse(result))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === "GET_LINKEDIN_COOKIE") {
    chrome.cookies
      .get({ url: "https://www.linkedin.com", name: "li_at" })
      .then((cookie) => {
        if (!cookie || !cookie.value) {
          sendResponse({
            success: false,
            error:
              "Cookie li_at non trouvé. Connectez-vous d'abord sur linkedin.com."
          });
        } else {
          sendResponse({ success: true, cookie: cookie.value });
        }
      })
      .catch((err) =>
        sendResponse({ success: false, error: err?.message || "Erreur" })
      );
    return true;
  }
});

// Récupérer et exécuter les actions APPROUVÉES + celles à REPRENDRE (continue)
async function pollAndExecuteActions() {
  if (isProcessing) return;
  console.log("[POLL] === Début du polling ===");

  try {
    // 1) Récupérer les actions approuvées (nouvelles)
    const response = await fetch(
      `${API_BASE_URL}/linkedin-actions?status=approved&limit=5`
    );

    if (!response.ok) {
      console.log(`[POLL] Erreur API: HTTP ${response.status}`);
      isConnected = false;
      return;
    }

    isConnected = true;
    const data = await response.json();
    let actionsToExecute =
      data.success && data.actions ? [...data.actions] : [];
    console.log(
      `[POLL] Actions approuvées trouvées: ${actionsToExecute.length}`
    );

    // 2) Récupérer aussi les actions en "processing" qui doivent être reprises (après un Continue)
    try {
      const resumeResp = await fetch(
        `${API_BASE_URL}/linkedin-actions?status=processing&limit=5`
      );
      if (resumeResp.ok) {
        const resumeData = await resumeResp.json();
        if (resumeData.success && resumeData.actions) {
          for (const action of resumeData.actions) {
            // Ne reprendre que les actions marquées "continue" ET pas déjà en cours d'exécution
            const result =
              typeof action.result === "string"
                ? JSON.parse(action.result || "{}")
                : action.result || {};
            if (
              result.last_action === "continue" &&
              !searchAndMessageActionIds.has(action.id) &&
              !searchAndConnectionActionIds.has(action.id)
            ) {
              console.log(`[POLL] Action #${action.id} à reprendre (continue)`);
              actionsToExecute.push(action);
            }
          }
        }
      }
    } catch (e) {
      // Silencieux — pas critique
    }

    if (actionsToExecute.length === 0) {
      updateBadge(0);
      return;
    }

    isProcessing = true;
    updateBadge(actionsToExecute.length);

    for (const action of actionsToExecute) {
      try {
        await executeAction(action);
        // Vérifier si l'action a été arrêtée — si oui, pas de délai d'attente
        const stoppedAfterExec = await checkIfActionStopped(action.id);
        if (stoppedAfterExec) {
          console.log(
            `[LinkedIn Guard] Action #${action.id} arrêtée — pas de délai, sortie immédiate`
          );
          continue; // Passer à l'action suivante sans délai
        }
        if (action.action_type !== "check_connection") {
          const waitMs = getRandomDelay(action.action_type);
          console.log(
            `[LinkedIn Guard] Attente de ${Math.round(waitMs / 1000)}s avant la prochaine action...`
          );
          await delay(waitMs);
        }
      } catch (error) {
        console.error(`Error executing action ${action.id}:`, error);
        // Ne pas écraser un statut "stopped" avec "failed"
        const isStopped = await checkIfActionStopped(action.id);
        if (!isStopped) {
          await updateActionStatus(action.id, "failed", null, error.message);
        }
      }
    }

    isProcessing = false;
    updateBadge(0);
  } catch (error) {
    console.error("Poll error:", error);
    isConnected = false;
    isProcessing = false;
  }
}

// Normaliser une URL LinkedIn (assurer https://www.linkedin.com/)
function normalizeLinkedInUrl(url) {
  if (!url) return url;
  return url.replace(
    /^https?:\/\/((?!www\.))(linkedin\.com)/i,
    "https://www.$2"
  );
}

// Exécuter une action spécifique
async function executeAction(action) {
  console.log(`Executing action: ${action.action_type} (ID: ${action.id})`);
  // Normaliser l'URL avant exécution
  if (action.target_url) {
    action.target_url = normalizeLinkedInUrl(action.target_url);
  }

  // Marquer l'action comme "processing" — SAUF si c'est une reprise (déjà processing)
  if (action.status !== "processing") {
    await updateActionStatus(action.id, "processing");
  }

  switch (action.action_type) {
    case "search":
      await executeSearch(action);
      break;
    case "visit_profile":
      await executeVisitProfile(action);
      break;
    case "send_connection":
      await executeSendConnection(action);
      break;
    case "send_message":
      await executeSendMessage(action);
      break;
    case "search_and_message":
      await executeSearchAndMessage(action);
      break;
    case "search_and_connection":
      await executeSearchAndConnection(action);
      break;
    case "check_connection":
      await executeCheckConnection(action);
      break;
    default:
      await updateActionStatus(
        action.id,
        "failed",
        null,
        `Type d'action inconnu: ${action.action_type}`
      );
  }
}

// Ouvrir un onglet LinkedIn et attendre son chargement complet
async function openLinkedInTab(url) {
  const tab = await chrome.tabs.create({ url, active: true });
  activeActionTabId = tab.id;
  await waitForTabLoad(tab.id);
  await delay(3000); // attendre le rendu dynamique LinkedIn
  return tab;
}

// Injecter le content script si pas déjà chargé (MV3 service worker)
async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  } catch (e) {
    // Déjà injecté ou erreur non bloquante
    console.log(
      "[Extension] Content script déjà présent ou non injectable:",
      e.message
    );
  }
  await delay(500);
}

// Exécuter une recherche LinkedIn
async function executeSearch(action) {
  let tab;
  try {
    tab = await openLinkedInTab(action.target_url);
    await delay(2000); // attente supplémentaire pour le rendu des résultats de recherche
    await ensureContentScript(tab.id);

    // Envoyer le message et attendre la réponse
    const response = await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(
            new Error("Timeout: content script n'a pas répondu après 15s")
          ),
        15000
      );
      chrome.tabs.sendMessage(
        tab.id,
        {
          type: "SCRAPE_SEARCH_RESULTS",
          actionId: action.id,
          payload: action.payload
        },
        (resp) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(resp);
          }
        }
      );
    });

    console.log("[Extension] Search message envoyé, réponse:", response);
    // Le résultat arrivera via le message SEARCH_RESULTS ou ACTION_FAILED
  } catch (error) {
    console.error("[Extension] executeSearch erreur:", error);
    if (tab) chrome.tabs.remove(tab.id).catch(() => {});
    await updateActionStatus(
      action.id,
      "failed",
      null,
      error.message || "Erreur lors de la recherche"
    );
  }
}

// Visiter un profil LinkedIn
async function executeVisitProfile(action) {
  let tab;
  try {
    tab = await openLinkedInTab(action.target_url);
    await ensureContentScript(tab.id);
    chrome.tabs.sendMessage(tab.id, {
      type: "SCRAPE_PROFILE",
      actionId: action.id
    });
  } catch (error) {
    if (tab) chrome.tabs.remove(tab.id).catch(() => {});
    await updateActionStatus(action.id, "failed", null, error.message);
  }
}

// Vérifier le degré de connexion d'un profil LinkedIn
async function executeCheckConnection(action) {
  let tab;
  try {
    tab = await openLinkedInTab(action.target_url);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        function wait(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }

        // Fonction de détection du degré
        function detectDegree() {
          // Méthode 1: span avec texte exact du degré
          for (const span of document.querySelectorAll("span")) {
            const txt = (span.textContent || "").trim();
            if (txt === "1er" || txt === "1st") return 1;
            if (txt === "2e" || txt === "2nd") return 2;
            if (
              txt === "3e+" ||
              txt === "3rd+" ||
              txt === "3e" ||
              txt === "3rd"
            )
              return 3;
          }

          // Méthode 2: aria-label
          for (const el of document.querySelectorAll("[aria-label]")) {
            const label = (el.getAttribute("aria-label") || "").toLowerCase();
            if (label.includes("1st degree") || label.includes("1er")) return 1;
            if (label.includes("2nd degree") || label.includes("2e")) return 2;
            if (label.includes("3rd") || label.includes("3e")) return 3;
          }

          // Méthode 3: classes CSS LinkedIn
          const degreeEl = document.querySelector(
            ".dist-value, .profile-topcard-person-entity__distance, [data-test-id='distance-badge']"
          );
          if (degreeEl) {
            const txt = (degreeEl.textContent || "").trim();
            if (txt.includes("1")) return 1;
            if (txt.includes("2")) return 2;
            return 3;
          }

          // Méthode 4: bouton "Message" visible = 1er degré
          for (const btn of document.querySelectorAll(
            "button, a[role='button']"
          )) {
            const txt = (btn.textContent || "").trim().toLowerCase();
            if (txt === "message" || txt === "envoyer un message") return 1;
          }

          // Méthode 5: bouton "Se connecter" visible = pas 1er degré
          for (const btn of document.querySelectorAll(
            "button, a[role='button']"
          )) {
            const txt = (btn.textContent || "").trim().toLowerCase();
            if (txt === "se connecter" || txt === "connect") return 2;
          }

          return null;
        }

        // Attendre que le profil soit chargé (chercher h1 ou .text-heading-xlarge)
        for (let i = 0; i < 15; i++) {
          const h1 = document.querySelector("h1");
          if (h1 && h1.textContent.trim().length > 0) break;
          await wait(500);
        }

        // Essayer de détecter le degré — avec retry (max 8 tentatives = ~8s)
        let degree = null;
        for (let attempt = 0; attempt < 8; attempt++) {
          degree = detectDegree();
          if (degree !== null) break;
          await wait(1000);
        }

        return { degree: degree || 0, connected: degree === 1 };
      },
      args: []
    });

    const res = results && results[0] && results[0].result;
    console.log("[Extension] checkConnection result:", JSON.stringify(res));

    await updateActionStatus(action.id, "completed", {
      degree: (res && res.degree) || 0,
      connected: (res && res.connected) || false,
      target_url: action.target_url,
      target_name: action.target_name
    });

    setTimeout(() => chrome.tabs.remove(tab.id).catch(() => {}), 1500);
  } catch (error) {
    console.error("[Extension] executeCheckConnection error:", error);
    if (tab) chrome.tabs.remove(tab.id).catch(() => {});
    await updateActionStatus(action.id, "failed", null, error.message);
  }
}

// Envoyer une demande de connexion via executeScript inline
async function executeSendConnection(action) {
  let tab;
  try {
    const payload =
      typeof action.payload === "string"
        ? JSON.parse(action.payload)
        : action.payload;
    const note = payload.note || "";

    tab = await openLinkedInTab(action.target_url);

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (noteText) => {
        function delay(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }
        try {
          await delay(1000);
          const allBtns = document.querySelectorAll('button, a[role="button"]');
          let connectBtn = null;
          for (const btn of allBtns) {
            const txt = (
              btn.textContent ||
              btn.getAttribute("aria-label") ||
              ""
            )
              .trim()
              .toLowerCase();
            if (txt === "se connecter" || txt === "connect") {
              connectBtn = btn;
              break;
            }
          }
          if (!connectBtn)
            return { success: false, error: "Bouton Se connecter non trouvé" };
          connectBtn.click();
          await delay(1500);
          if (noteText) {
            const addNoteBtn = Array.from(
              document.querySelectorAll("button")
            ).find((b) => {
              const t = (b.textContent || "").trim().toLowerCase();
              return t.includes("ajouter une note") || t.includes("add a note");
            });
            if (addNoteBtn) {
              addNoteBtn.click();
              await delay(500);
              const noteField = document.querySelector(
                "#custom-message, textarea[name='message'], .send-invite__custom-message"
              );
              if (noteField) {
                noteField.focus();
                document.execCommand("insertText", false, noteText);
                noteField.dispatchEvent(new Event("input", { bubbles: true }));
                await delay(300);
              }
            }
          }
          const sendBtn = Array.from(document.querySelectorAll("button")).find(
            (b) => {
              const t = (b.textContent || "").trim().toLowerCase();
              return t === "envoyer" || t === "send" || t.includes("envoyer l");
            }
          );
          if (!sendBtn)
            return { success: false, error: "Bouton Envoyer non trouvé" };
          sendBtn.click();
          await delay(1000);
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message || "Erreur inconnue" };
        }
      },
      args: [note]
    });

    const res = results && results[0] && results[0].result;
    if (res && res.success) {
      await updateActionStatus(action.id, "completed", { sent: true });
      // Marquer le prospect comme 'identified' (= demande de connexion envoyée)
      try {
        await fetch(`${API_BASE_URL}/prospects/update-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkedin_url: action.target_url,
            status: "identified"
          })
        });
        console.log(
          `[SEND_CONN] ✅ ${action.target_name || action.target_url} → status 'identified'`
        );
      } catch (e) {
        console.log(`[SEND_CONN] ⚠️ Erreur update status: ${e.message}`);
      }
    } else {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        (res && res.error) || "Erreur inconnue"
      );
    }
    setTimeout(() => chrome.tabs.remove(tab.id).catch(() => {}), 2000);
  } catch (error) {
    if (tab) chrome.tabs.remove(tab.id).catch(() => {});
    await updateActionStatus(action.id, "failed", null, error.message);
  }
}

// =============================================
// SEARCH AND MESSAGE — UNE SEULE ACTION POUR TOUT
// Recherche les profils, puis envoie un message à chacun
// L'action est 'completed' seulement si au moins un message est envoyé
// =============================================
async function executeSearchAndMessage(action) {
  let searchTab;
  // Enregistrer l'ID pour que le listener global SEARCH_RESULTS ne traite PAS cette action
  searchAndMessageActionIds.add(action.id);
  try {
    console.log("[SEARCH&MSG] === DÉBUT === Action #" + action.id);
    console.log(
      "[SEARCH&MSG] Status:",
      action.status,
      "| Type:",
      action.action_type
    );
    console.log("[SEARCH&MSG] URL:", action.target_url);
    console.log("[SEARCH&MSG] Payload type:", typeof action.payload);

    if (!action.payload) {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        "Payload manquant ou null dans l'action"
      );
      return;
    }

    const payload =
      typeof action.payload === "string"
        ? JSON.parse(action.payload)
        : action.payload;
    const messageTemplate = payload.message_template || "";
    const campaignId = payload.campaign_id || action.campaign_id || null;

    if (campaignId) {
      console.log(
        `[SEARCH&MSG] Campagne liée: #${campaignId} (${payload.campaign_name || "N/A"})`
      );
    }

    if (!messageTemplate) {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        "Pas de message_template dans le payload"
      );
      return;
    }

    console.log("[SEARCH&MSG] Template:", messageTemplate.substring(0, 80));

    // Vérifier si c'est une reprise après stop (profiles_data sauvegardés dans le résultat)
    const prevResult =
      typeof action.result === "string"
        ? JSON.parse(action.result || "{}")
        : action.result || {};
    const isResume =
      prevResult.profiles_data && prevResult.profiles_data.length > 0;
    let profiles;
    const prospectIdMap = {}; // linkedin_url → prospect_id (accessible dans toute la fonction)

    if (isResume) {
      // === REPRISE APRÈS STOP : utiliser les profils sauvegardés ===
      console.log(
        `[SEARCH&MSG] 🔄 Reprise après stop — ${prevResult.profiles_data.length} profils sauvegardés, ${(prevResult.sent_profiles || []).length} déjà contactés`
      );
      profiles = prevResult.profiles_data;
    } else {
      // =============================================
      // PHASE 1: RECHERCHE — ouvrir la page et scraper les profils
      // =============================================
      searchTab = await openLinkedInTab(action.target_url);

      // Vérifier stop après l'ouverture du tab (l'utilisateur a peut-être cliqué Stop)
      const stoppedDuringSearch = await checkIfActionStopped(action.id);
      if (stoppedDuringSearch) {
        console.log(
          `[SEARCH&MSG] ⏸️ Action #${action.id} arrêtée pendant la phase de recherche`
        );
        if (searchTab?.id) chrome.tabs.remove(searchTab.id).catch(() => {});
        await updateActionStatus(action.id, "stopped", {
          profiles_found: 0,
          messages_sent: 0,
          message_template: messageTemplate
        });
        return;
      }

      await delay(2000);
      await ensureContentScript(searchTab.id);

      // Attendre les résultats de recherche via le content script
      profiles = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Timeout: scraping recherche après 30s")),
          30000
        );

        // Écouter le message SEARCH_RESULTS du content script
        function searchListener(message, sender, sendResponse) {
          if (
            message.type === "SEARCH_RESULTS" &&
            message.actionId === action.id
          ) {
            clearTimeout(timeout);
            chrome.runtime.onMessage.removeListener(searchListener);
            sendResponse({ success: true });
            resolve(message.data || []);
            return true;
          }
          if (
            message.type === "ACTION_FAILED" &&
            message.actionId === action.id
          ) {
            clearTimeout(timeout);
            chrome.runtime.onMessage.removeListener(searchListener);
            sendResponse({ success: true });
            reject(new Error(message.error || "Erreur scraping recherche"));
            return true;
          }
        }
        chrome.runtime.onMessage.addListener(searchListener);

        // Déclencher le scraping
        chrome.tabs.sendMessage(
          searchTab.id,
          {
            type: "SCRAPE_SEARCH_RESULTS",
            actionId: action.id,
            payload: action.payload
          },
          (resp) => {
            if (chrome.runtime.lastError) {
              clearTimeout(timeout);
              chrome.runtime.onMessage.removeListener(searchListener);
              reject(new Error(chrome.runtime.lastError.message));
            }
          }
        );
      });

      // Fermer l'onglet de recherche
      if (searchTab?.id) {
        chrome.tabs.remove(searchTab.id).catch(() => {});
        searchTab = null;
      }

      console.log("[SEARCH&MSG] Profils trouvés:", profiles.length);

      if (!profiles || profiles.length === 0) {
        await updateActionStatus(
          action.id,
          "failed",
          { profiles: [] },
          "Aucun profil trouvé dans la recherche"
        );
        return;
      }

      // Sauvegarder les prospects en DB et récupérer leurs IDs
      try {
        const bulkPayload = {
          prospects: profiles,
          source: "linkedin_search",
          search_action_id: action.id
        };
        if (campaignId) bulkPayload.campaign_id = campaignId;
        const bulkRes = await fetch(`${API_BASE_URL}/prospects/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bulkPayload)
        });
        const bulkData = await bulkRes.json();
        if (bulkData.success && bulkData.prospects) {
          for (const p of bulkData.prospects) {
            if (p.linkedin_url) prospectIdMap[p.linkedin_url] = p.id;
          }
          console.log(
            `[SEARCH&MSG] 💾 ${bulkData.saved_count} prospects sauvegardés en DB (IDs récupérés: ${Object.keys(prospectIdMap).length})`
          );
        }
      } catch (e) {
        console.log(
          "[SEARCH&MSG] Erreur sauvegarde prospects (non bloquante):",
          e.message
        );
      }
    }

    // Résoudre les IDs des prospects si pas encore dans le map (reprise ou fallback)
    if (Object.keys(prospectIdMap).length === 0 && profiles.length > 0) {
      console.log(
        "[SEARCH&MSG] 🔍 Résolution des IDs prospects depuis la DB..."
      );
      try {
        const bulkRes = await fetch(`${API_BASE_URL}/prospects/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prospects: profiles,
            source: "linkedin_search",
            search_action_id: action.id
          })
        });
        const bulkData = await bulkRes.json();
        if (bulkData.success && bulkData.prospects) {
          for (const p of bulkData.prospects) {
            if (p.linkedin_url) prospectIdMap[p.linkedin_url] = p.id;
          }
          console.log(
            `[SEARCH&MSG] 💾 IDs résolus: ${Object.keys(prospectIdMap).length} prospects`
          );
        }
      } catch (e) {
        console.log(
          "[SEARCH&MSG] ⚠️ Erreur résolution IDs (non bloquante):",
          e.message
        );
      }
    }

    // =============================================
    // PHASE 2: ENVOYER UN MESSAGE À CHAQUE PROFIL
    // =============================================
    // Récupérer les profils déjà contactés (en cas de reprise après stop)
    const existingResult =
      typeof action.result === "string"
        ? JSON.parse(action.result || "{}")
        : action.result || {};
    const alreadySentProfiles = new Set(
      (existingResult.sent_profiles || []).map((p) => p.toLowerCase())
    );

    let messagesSent = 0;
    let messagesFailed = 0;
    const results = [];

    // Marquer l'action comme "en cours" — PRÉSERVER les données de reprise pour stop/continue illimité
    const processingOk = await updateActionStatus(
      action.id,
      "processing",
      {
        profiles_data: profiles.map((p) => ({
          name: p.name,
          linkedin_url: p.linkedin_url,
          role: p.role,
          company: p.company
        })),
        sent_profiles: Array.from(alreadySentProfiles),
        messages_sent: existingResult.messages_sent || 0,
        message_template: messageTemplate
      },
      null
    );

    // Si l'update a échoué (action déjà stoppée par l'utilisateur pendant la phase recherche)
    if (!processingOk) {
      console.log(
        `[SEARCH&MSG] ⏸️ Action #${action.id} déjà arrêtée avant la phase messages — sauvegarde et sortie`
      );
      await updateActionStatus(action.id, "stopped", {
        profiles_found: profiles.length,
        messages_sent: existingResult.messages_sent || 0,
        messages_failed: 0,
        sent_profiles: Array.from(alreadySentProfiles),
        profiles_data: profiles.map((p) => ({
          name: p.name,
          linkedin_url: p.linkedin_url,
          role: p.role,
          company: p.company
        })),
        message_template: messageTemplate
      });
      return;
    }

    for (let i = 0; i < profiles.length; i++) {
      // === VÉRIFIER SI L'UTILISATEUR A CLIQUÉ STOP ===
      console.log(
        `[STOP_CHECK] >>> Vérification stop AVANT profil ${i + 1}/${profiles.length} — Action #${action.id}`
      );
      const wasStopped = await checkIfActionStopped(action.id);
      console.log(`[STOP_CHECK] <<< Résultat: wasStopped=${wasStopped}`);
      if (wasStopped) {
        console.log(
          `[SEARCH&MSG] ⏸️ Action #${action.id} arrêtée par l'utilisateur au profil ${i + 1}/${profiles.length}`
        );
        // Sauvegarder la progression pour pouvoir reprendre
        const sentProfileNames = results
          .filter((r) => r.status === "sent")
          .map((r) => r.name);
        // Ajouter les profils déjà envoyés précédemment
        const allSentProfiles = [
          ...new Set([
            ...Array.from(alreadySentProfiles),
            ...sentProfileNames.map((n) => n.toLowerCase())
          ])
        ];
        await updateActionStatus(action.id, "stopped", {
          profiles_found: profiles.length,
          messages_sent: messagesSent + (existingResult.messages_sent || 0),
          messages_failed: messagesFailed,
          stopped_at_index: i,
          sent_profiles: allSentProfiles,
          details: results,
          profiles_data: profiles.map((p) => ({
            name: p.name,
            linkedin_url: p.linkedin_url,
            role: p.role,
            company: p.company
          })),
          message_template: messageTemplate
        });
        return;
      }

      const profile = profiles[i];
      if (!profile.linkedin_url) {
        console.log(
          `[SEARCH&MSG] Profil ${i + 1}/${profiles.length}: pas de linkedin_url, ignoré`
        );
        messagesFailed++;
        results.push({
          name: profile.name,
          status: "skipped",
          reason: "no_url"
        });
        continue;
      }

      // Vérifier si ce profil a déjà reçu un message (reprise après stop)
      if (alreadySentProfiles.has((profile.name || "").toLowerCase())) {
        console.log(
          `[SEARCH&MSG] Profil ${i + 1}/${profiles.length}: ${profile.name} — déjà contacté, ignoré`
        );
        results.push({ name: profile.name, status: "already_sent" });
        // NE PAS incrémenter messagesSent — déjà compté dans existingResult.messages_sent
        continue;
      }

      // Personnaliser le message — nettoyage des valeurs pour éviter les descriptions longues
      const cleanName = (profile.name || "Bonjour").split(/[•·|]/)[0].trim(); // Garde seulement le prénom/nom avant tout séparateur
      const cleanRole = (profile.role || "").split(/[|•·\n]/)[0].trim(); // Garde seulement le premier titre avant | ou •
      const cleanCompany = (profile.company || "").split(/[|•·\n]/)[0].trim();

      const personalizedMessage = messageTemplate
        .replace(/\{name\}/g, cleanName)
        .replace(/\{role\}/g, cleanRole)
        .replace(/\{company\}/g, cleanCompany);

      console.log(
        `[SEARCH&MSG] Profil ${i + 1}/${profiles.length}: ${profile.name} — ${profile.linkedin_url}`
      );
      console.log(
        `[SEARCH&MSG] Message: ${personalizedMessage.substring(0, 60)}...`
      );

      // Délai anti-ban entre les messages (sauf le premier) — INTERRUPTIBLE
      if (i > 0) {
        const msgDelay = getRandomDelay("send_message");
        console.log(
          `[SEARCH&MSG] Attente ${Math.round(msgDelay / 1000)}s avant prochain message (interruptible)...`
        );
        const stoppedDuringDelay = await interruptibleDelay(
          msgDelay,
          action.id
        );
        if (stoppedDuringDelay) {
          console.log(
            `[SEARCH&MSG] ⏸️ Action #${action.id} arrêtée pendant le délai anti-ban au profil ${i + 1}/${profiles.length}`
          );
          const allSentProfiles = [
            ...new Set([
              ...Array.from(alreadySentProfiles),
              ...results
                .filter((r) => r.status === "sent")
                .map((r) => r.name.toLowerCase())
            ])
          ];
          await updateActionStatus(action.id, "stopped", {
            profiles_found: profiles.length,
            messages_sent: messagesSent + (existingResult.messages_sent || 0),
            messages_failed: messagesFailed,
            stopped_at_index: i,
            sent_profiles: allSentProfiles,
            details: results,
            profiles_data: profiles.map((p) => ({
              name: p.name,
              linkedin_url: p.linkedin_url,
              role: p.role,
              company: p.company
            })),
            message_template: messageTemplate
          });
          return;
        }
      }

      // Envoyer le message en utilisant executeSendMessage en interne
      // Timeout de 120s max pour éviter que l'action reste bloquée en "processing"
      try {
        const sendResult = await Promise.race([
          sendMessageToProfile(
            profile.linkedin_url,
            personalizedMessage,
            action.id
          ),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Timeout: envoi du message > 120s")),
              120000
            )
          )
        ]);

        // === Si l'envoi a été interrompu par un STOP ===
        if (sendResult.stopped) {
          console.log(
            `[SEARCH&MSG] ⏸️ Action #${action.id} arrêtée PENDANT l'envoi au profil ${i + 1}/${profiles.length}`
          );
          const allSentProfiles = [
            ...new Set([
              ...Array.from(alreadySentProfiles),
              ...results
                .filter((r) => r.status === "sent")
                .map((r) => r.name.toLowerCase())
            ])
          ];
          await updateActionStatus(action.id, "stopped", {
            profiles_found: profiles.length,
            messages_sent: messagesSent + (existingResult.messages_sent || 0),
            messages_failed: messagesFailed,
            stopped_at_index: i,
            sent_profiles: allSentProfiles,
            details: results,
            profiles_data: profiles.map((p) => ({
              name: p.name,
              linkedin_url: p.linkedin_url,
              role: p.role,
              company: p.company
            })),
            message_template: messageTemplate
          });
          return;
        }

        if (sendResult.success) {
          messagesSent++;
          results.push({ name: profile.name, status: "sent" });
          console.log(`[SEARCH&MSG] ✅ Message envoyé à ${profile.name}`);

          // Récupérer le prospect_id pour lier le message au prospect
          const prospectId = prospectIdMap[profile.linkedin_url] || null;

          // Sauvegarder le message dans la table messages (lié au prospect ET à la campagne)
          try {
            const msgPayload = {
              recipient_name: cleanName,
              message_text: personalizedMessage,
              message_type: "connection",
              status: "sent"
            };
            if (cleanRole) msgPayload.recipient_role = cleanRole;
            if (cleanCompany) msgPayload.recipient_company = cleanCompany;
            if (prospectId) msgPayload.prospect_id = prospectId;
            if (campaignId) msgPayload.campaign_id = campaignId;

            console.log(
              `[SEARCH&MSG] 💾 Sauvegarde message vers ${API_BASE_URL}/messages... (prospect_id: ${prospectId})`
            );
            const saveRes = await fetch(`${API_BASE_URL}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(msgPayload)
            });
            const saveData = await saveRes.json();
            if (saveRes.ok && saveData.success) {
              console.log(
                `[SEARCH&MSG] 💾 Message sauvegardé en DB pour ${cleanName} (id: ${saveData.message?.id})`
              );
            } else {
              console.log(
                `[SEARCH&MSG] ⚠️ Erreur sauvegarde: ${saveRes.status} — ${JSON.stringify(saveData)}`
              );
            }
          } catch (dbErr) {
            console.log(
              `[SEARCH&MSG] ⚠️ Erreur sauvegarde message (non bloquante): ${dbErr.message}`
            );
          }

          // Mettre à jour le statut du prospect → "contacted"
          try {
            const updatePayload = { status: "contacted" };
            if (prospectId) {
              updatePayload.prospect_id = prospectId;
            } else if (profile.linkedin_url) {
              updatePayload.linkedin_url = profile.linkedin_url;
            }
            const updateRes = await fetch(
              `${API_BASE_URL}/prospects/update-status`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatePayload)
              }
            );
            const updateData = await updateRes.json();
            if (updateRes.ok && updateData.success) {
              console.log(
                `[SEARCH&MSG] 📊 Prospect ${cleanName} → statut "contacted"`
              );
            } else {
              console.log(
                `[SEARCH&MSG] ⚠️ Erreur màj statut prospect: ${JSON.stringify(updateData)}`
              );
            }
          } catch (statusErr) {
            console.log(
              `[SEARCH&MSG] ⚠️ Erreur màj statut prospect (non bloquante): ${statusErr.message}`
            );
          }
        } else {
          messagesFailed++;
          results.push({
            name: profile.name,
            status: "failed",
            error: sendResult.error
          });
          console.log(
            `[SEARCH&MSG] ❌ Échec pour ${profile.name}: ${sendResult.error}`
          );
        }
      } catch (e) {
        messagesFailed++;
        results.push({
          name: profile.name,
          status: "failed",
          error: e.message
        });
        console.log(
          `[SEARCH&MSG] ❌ Exception pour ${profile.name}: ${e.message}`
        );
      }

      // === VÉRIFIER STOP APRÈS CHAQUE ENVOI ===
      const stoppedAfterSend = await checkIfActionStopped(action.id);
      if (stoppedAfterSend) {
        console.log(
          `[SEARCH&MSG] ⏸️ Action #${action.id} arrêtée après envoi au profil ${i + 1}/${profiles.length}`
        );
        const allSentProfiles = [
          ...new Set([
            ...Array.from(alreadySentProfiles),
            ...results
              .filter((r) => r.status === "sent")
              .map((r) => r.name.toLowerCase())
          ])
        ];
        await updateActionStatus(action.id, "stopped", {
          profiles_found: profiles.length,
          messages_sent: messagesSent + (existingResult.messages_sent || 0),
          messages_failed: messagesFailed,
          stopped_at_index: i + 1,
          sent_profiles: allSentProfiles,
          details: results,
          profiles_data: profiles.map((p) => ({
            name: p.name,
            linkedin_url: p.linkedin_url,
            role: p.role,
            company: p.company
          })),
          message_template: messageTemplate
        });
        return;
      }
    }

    // =============================================
    // RÉSULTAT FINAL: completed si au moins 1 message envoyé
    // =============================================
    console.log(
      `[SEARCH&MSG] === FIN === Envoyés: ${messagesSent}, Échoués: ${messagesFailed}`
    );

    // Compteurs cumulatifs (ajout des messages des cycles précédents)
    const totalSent = messagesSent + (existingResult.messages_sent || 0);
    const totalFailed = messagesFailed;

    if (totalSent > 0) {
      await updateActionStatus(action.id, "completed", {
        profiles_found: profiles.length,
        messages_sent: totalSent,
        messages_failed: totalFailed,
        details: results
      });
    } else {
      await updateActionStatus(
        action.id,
        "failed",
        {
          profiles_found: profiles.length,
          messages_sent: 0,
          messages_failed: totalFailed,
          details: results,
          // Préserver pour un éventuel retry
          profiles_data: profiles.map((p) => ({
            name: p.name,
            linkedin_url: p.linkedin_url,
            role: p.role,
            company: p.company
          })),
          message_template: messageTemplate
        },
        `Aucun message envoyé (${profiles.length} profils trouvés, ${totalFailed} échecs)`
      );
    }
  } catch (error) {
    console.error("[SEARCH&MSG] Erreur globale:", error);
    if (searchTab?.id) chrome.tabs.remove(searchTab.id).catch(() => {});
    await updateActionStatus(
      action.id,
      "failed",
      null,
      error.message || "Erreur recherche et message"
    );
  } finally {
    // Toujours nettoyer le Set pour éviter les fuites mémoire
    searchAndMessageActionIds.delete(action.id);

    // FILET DE SÉCURITÉ: vérifier que l'action n'est PAS restée en "processing"
    try {
      const checkResp = await fetch(
        `${API_BASE_URL}/linkedin-actions?id=${action.id}`
      );
      if (checkResp.ok) {
        const checkData = await checkResp.json();
        const actionData = checkData.actions?.[0];
        const currentStatus = actionData?.status;
        if (currentStatus === "processing") {
          // Ne PAS forcer completed si l'action attend d'être reprise (continue)
          const resultData =
            typeof actionData.result === "string"
              ? JSON.parse(actionData.result || "{}")
              : actionData.result || {};
          if (resultData.last_action === "continue") {
            console.log(
              `[SEARCH&MSG] Action #${action.id} en attente de reprise — pas de forçage`
            );
          } else {
            console.warn(
              `[SEARCH&MSG] ⚠️ Action #${action.id} encore en "processing" dans finally — forçage "completed"`
            );
            await updateActionStatus(action.id, "completed", {
              safety_net: true,
              message: "Action finalisée par le filet de sécurité"
            });
          }
        }
      }
    } catch (e) {
      console.error("[SEARCH&MSG] Erreur filet de sécurité:", e.message);
    }
  }
}

async function executeSearchAndConnection(action) {
  let searchTab;
  // Enregistrer l'ID pour que le listener global SEARCH_RESULTS ne traite PAS cette action
  searchAndConnectionActionIds.add(action.id);
  try {
    console.log("[SEARCH&CONN] === DÉBUT === Action #" + action.id);
    console.log(
      "[SEARCH&CONN] Status:",
      action.status,
      "| Type:",
      action.action_type
    );
    console.log("[SEARCH&CONN] URL:", action.target_url);
    console.log("[SEARCH&CONN] Payload type:", typeof action.payload);

    if (!action.payload) {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        "Payload manquant ou null dans l'action"
      );
      return;
    }

    const payload =
      typeof action.payload === "string"
        ? JSON.parse(action.payload)
        : action.payload;
    const campaignId = payload.campaign_id || action.campaign_id || null;

    if (campaignId) {
      console.log(
        `[SEARCH&CONN] Campagne liée: #${campaignId} (${payload.campaign_name || "N/A"})`
      );
    }

    // Vérifier si c'est une reprise après stop (profiles_data sauvegardés dans le résultat)
    const prevResult =
      typeof action.result === "string"
        ? JSON.parse(action.result || "{}")
        : action.result || {};
    const isResume =
      prevResult.profiles_data && prevResult.profiles_data.length > 0;
    let profiles;
    const prospectIdMap = {};

    if (isResume) {
      console.log(
        `[SEARCH&CONN] 🔄 Reprise après stop — ${prevResult.profiles_data.length} profils sauvegardés, ${(prevResult.sent_profiles || []).length} déjà contactés`
      );
      profiles = prevResult.profiles_data;
    } else {
      // PHASE 1: RECHERCHE — ouvrir la page et scraper les profils
      searchTab = await openLinkedInTab(action.target_url);

      const stoppedDuringSearch = await checkIfActionStopped(action.id);
      if (stoppedDuringSearch) {
        console.log(
          `[SEARCH&CONN] ⏸️ Action #${action.id} arrêtée pendant la phase de recherche`
        );
        if (searchTab?.id) chrome.tabs.remove(searchTab.id).catch(() => {});
        await updateActionStatus(action.id, "stopped", {
          profiles_found: 0,
          connections_sent: 0
        });
        return;
      }

      await delay(2000);
      await ensureContentScript(searchTab.id);

      profiles = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Timeout: scraping recherche après 30s")),
          30000
        );

        function searchListener(message, sender, sendResponse) {
          if (
            message.type === "SEARCH_RESULTS" &&
            message.actionId === action.id
          ) {
            clearTimeout(timeout);
            chrome.runtime.onMessage.removeListener(searchListener);
            sendResponse({ success: true });
            resolve(message.data || []);
            return true;
          }
          if (
            message.type === "ACTION_FAILED" &&
            message.actionId === action.id
          ) {
            clearTimeout(timeout);
            chrome.runtime.onMessage.removeListener(searchListener);
            sendResponse({ success: true });
            reject(new Error(message.error || "Erreur scraping recherche"));
            return true;
          }
        }
        chrome.runtime.onMessage.addListener(searchListener);

        chrome.tabs.sendMessage(
          searchTab.id,
          {
            type: "SCRAPE_SEARCH_RESULTS",
            actionId: action.id,
            payload: action.payload
          },
          (resp) => {
            if (chrome.runtime.lastError) {
              clearTimeout(timeout);
              chrome.runtime.onMessage.removeListener(searchListener);
              reject(new Error(chrome.runtime.lastError.message));
            }
          }
        );
      });

      if (searchTab?.id) {
        chrome.tabs.remove(searchTab.id).catch(() => {});
        searchTab = null;
      }

      console.log("[SEARCH&CONN] Profils trouvés:", profiles.length);

      if (!profiles || profiles.length === 0) {
        await updateActionStatus(
          action.id,
          "failed",
          { profiles: [] },
          "Aucun profil trouvé dans la recherche"
        );
        return;
      }

      // Sauvegarder les prospects en DB
      try {
        const bulkPayload = {
          prospects: profiles,
          source: "linkedin_search",
          search_action_id: action.id
        };
        if (campaignId) bulkPayload.campaign_id = campaignId;
        const bulkRes = await fetch(`${API_BASE_URL}/prospects/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bulkPayload)
        });
        const bulkData = await bulkRes.json();
        if (bulkData.success && bulkData.prospects) {
          for (const p of bulkData.prospects) {
            if (p.linkedin_url) prospectIdMap[p.linkedin_url] = p.id;
          }
          console.log(
            `[SEARCH&CONN] 💾 ${bulkData.saved_count} prospects sauvegardés en DB`
          );
        }
      } catch (e) {
        console.log(
          "[SEARCH&CONN] Erreur sauvegarde prospects (non bloquante):",
          e.message
        );
      }
    }

    // Résoudre les IDs des prospects si pas encore dans le map
    if (Object.keys(prospectIdMap).length === 0 && profiles.length > 0) {
      try {
        const bulkRes = await fetch(`${API_BASE_URL}/prospects/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prospects: profiles,
            source: "linkedin_search",
            search_action_id: action.id
          })
        });
        const bulkData = await bulkRes.json();
        if (bulkData.success && bulkData.prospects) {
          for (const p of bulkData.prospects) {
            if (p.linkedin_url) prospectIdMap[p.linkedin_url] = p.id;
          }
        }
      } catch (e) {
        console.log(
          "[SEARCH&CONN] Erreur résolution IDs prospects:",
          e.message
        );
      }
    }

    // PHASE 2: Envoyer des demandes de connexion (sans message)
    const dailyLimit = payload.daily_limit || 20;
    // Support both old format (array of strings) and new format (array of {name,url,id})
    const alreadySentProfiles = new Map(); // keyed by url or name
    for (const item of prevResult.sent_profiles || []) {
      if (typeof item === "object" && item !== null) {
        const key = item.url || item.name || "";
        if (key) alreadySentProfiles.set(key, item);
      } else if (typeof item === "string") {
        alreadySentProfiles.set(item, { name: item, url: null, id: null });
      }
    }
    let connectionsSent = 0;
    let results = [];

    console.log(
      `[SEARCH&CONN] 🚀 Début envoi connexions — limite quotidienne: ${dailyLimit}`
    );

    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const profileUrl = profile.linkedin_url;

      // Vérifier stop avant chaque envoi
      const stopped = await checkIfActionStopped(action.id);
      if (stopped) {
        console.log(
          `[SEARCH&CONN] ⏸️ Action #${action.id} arrêtée pendant l'envoi des connexions`
        );
        await updateActionStatus(action.id, "stopped", {
          profiles_found: profiles.length,
          connections_sent: connectionsSent,
          profiles_data: profiles,
          sent_profiles: Array.from(alreadySentProfiles.values()),
          last_action: "continue"
        });
        return;
      }

      // Vérifier limite quotidienne
      const dailyCount = dailyCounters["send_connection"] || 0;
      if (dailyCount >= DAILY_LIMITS["send_connection"]) {
        console.log(
          `[SEARCH&CONN] ⚠️ Limite quotidienne atteinte (${dailyCount}/${DAILY_LIMITS["send_connection"]})`
        );
        break;
      }

      // Skip si déjà envoyé (vérifier par URL d'abord, puis par nom)
      if (
        alreadySentProfiles.has(profileUrl) ||
        alreadySentProfiles.has((profile.name || "").toLowerCase())
      ) {
        continue;
      }

      // Préparer la note personnalisée pour ce profil (remplacer {name})
      const baseNote = payload.note_template || "";
      const note = baseNote
        ? baseNote.replace(/{name}/gi, profile.name || "")
        : null;

      // Envoyer demande de connexion (avec note si fournie)
      const sendResult = await sendConnectionRequest(profileUrl, action.id, note);

      if (sendResult.success) {
        connectionsSent++;
        incrementCounter("send_connection");
        const prospectId = prospectIdMap[profileUrl] || null;
        alreadySentProfiles.set(profileUrl, {
          name: (profile.name || "").toLowerCase(),
          url: profileUrl,
          id: prospectId
        });
        results.push({ name: profile.name, status: "sent" });
        console.log(`[SEARCH&CONN] ✅ Connexion envoyée à ${profile.name}`);

        // Marquer le prospect comme 'identified' (= demande de connexion envoyée, en attente)
        try {
          await fetch(`${API_BASE_URL}/prospects/update-status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              linkedin_url: profileUrl,
              status: "identified"
            })
          });
        } catch (e) {
          console.log(`[SEARCH&CONN] ⚠️ Erreur update status: ${e.message}`);
        }
        // Le status passera à 'connected' quand la personne accepte la connexion
        // (géré par checkPendingConnectionsFast toutes les 2 min).

        // Incrémenter connections_sent dans la campagne
        if (campaignId) {
          try {
            await fetch(`${API_BASE_URL}/campaigns/update-stats`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                campaign_id: campaignId,
                stat: "connections_sent"
              })
            });
          } catch (e) {
            console.log("[SEARCH&CONN] Erreur update stats:", e.message);
          }
        }

        // Délai entre les connexions
        const delayMs = getRandomDelay("send_connection");
        console.log(
          `[SEARCH&CONN] ⏱️ Attente ${Math.round(delayMs / 1000)}s avant prochaine connexion...`
        );
        await delay(delayMs);
      } else {
        results.push({
          name: profile.name,
          status: "failed",
          error: sendResult.error
        });
        console.log(
          `[SEARCH&CONN] ❌ Échec pour ${profile.name}: ${sendResult.error}`
        );
      }

      // Sauvegarder la progression périodiquement
      if (connectionsSent % 5 === 0) {
        await updateActionStatus(action.id, "processing", {
          profiles_found: profiles.length,
          connections_sent: connectionsSent,
          profiles_data: profiles,
          sent_profiles: Array.from(alreadySentProfiles.values()),
          last_action: "continue"
        });
      }
    }

    await updateActionStatus(action.id, "completed", {
      profiles_found: profiles.length,
      connections_sent: connectionsSent,
      profiles_data: profiles,
      sent_profiles: Array.from(alreadySentProfiles.values())
    });

    console.log(
      `[SEARCH&CONN] ✅ Terminé — ${connectionsSent}/${profiles.length} connexions envoyées`
    );
  } catch (error) {
    console.error("[SEARCH&CONN] Erreur globale:", error);
    if (searchTab?.id) chrome.tabs.remove(searchTab.id).catch(() => {});
    await updateActionStatus(action.id, "failed", null, error.message);
  } finally {
    searchAndConnectionActionIds.delete(action.id);
    try {
      const checkResp = await fetch(
        `${API_BASE_URL}/linkedin-actions?id=${action.id}`
      );
      if (checkResp.ok) {
        const checkData = await checkResp.json();
        const actionData = checkData.actions?.[0];
        const currentStatus = actionData?.status;
        if (currentStatus === "processing") {
          const resultData =
            typeof actionData.result === "string"
              ? JSON.parse(actionData.result || "{}")
              : actionData.result || {};
          if (resultData.last_action === "continue") {
            console.log(
              `[SEARCH&CONN] Action #${action.id} en attente de reprise — pas de forçage`
            );
          } else {
            await updateActionStatus(action.id, "completed", {
              safety_net: true,
              message: "Action finalisée par le filet de sécurité"
            });
          }
        }
      }
    } catch (e) {
      console.error("[SEARCH&CONN] Erreur filet de sécurité:", e.message);
    }
  }
}

// Envoyer une demande de connexion (optionnellement avec note personnalisée)
async function sendConnectionRequest(profileUrl, actionId = null, note = null) {
  let tab;
  try {
    tab = await openLinkedInTab(profileUrl);
    console.log("[SEND_CONN] Profil ouvert, tab", tab.id, note ? "avec note" : "sans note");

    if (actionId) {
      const stopped = await checkIfActionStopped(actionId);
      if (stopped) {
        if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
        return { success: false, stopped: true, error: "Action arrêtée" };
      }
    }

    // Cliquer sur le bouton "Plus" ou "Connecter"
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [note],
      func: async (noteText) => {
        function wait(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }
        function isVisible(el) {
          return el && el.offsetParent !== null;
        }

        for (let i = 0; i < 15; i++) {
          const h1 = document.querySelector("h1");
          if (h1 && h1.textContent.trim().length > 0) break;
          await wait(1000);
        }
        await wait(2000);

        // Chercher le bouton "Connecter" directement ou via "Plus"
        const clickables = document.querySelectorAll(
          'button, a[role="button"], div[role="button"]'
        );
        let connectBtn = null;
        let moreBtn = null;

        for (const el of clickables) {
          if (!isVisible(el)) continue;
          const txt = (el.innerText || "").trim().toLowerCase();
          const aria = (el.getAttribute("aria-label") || "")
            .trim()
            .toLowerCase();

          // Bouton Connecter direct
          if (
            txt === "connect" ||
            txt === "se connecter" ||
            txt === "connecter" ||
            aria === "connect" ||
            aria === "se connecter" ||
            (aria.includes("invite") && aria.includes("connect")) ||
            aria.includes("envoyer une invitation")
          ) {
            connectBtn = el;
            break;
          }
          // Bouton "Plus" / "More" pour accéder au menu
          if (
            txt === "plus" ||
            txt === "more" ||
            aria === "more" ||
            aria === "plus"
          ) {
            moreBtn = el;
          }
        }

        // Si pas de bouton direct, essayer via "Plus"
        if (!connectBtn && moreBtn) {
          moreBtn.click();
          await wait(1500);

          const menuItems = document.querySelectorAll(
            'button, a[role="button"], div[role="menuitem"], li[role="menuitem"] button'
          );
          for (const el of menuItems) {
            if (!isVisible(el)) continue;
            const txt = (el.innerText || "").trim().toLowerCase();
            const aria = (el.getAttribute("aria-label") || "")
              .trim()
              .toLowerCase();
            if (
              txt === "connect" ||
              txt === "se connecter" ||
              txt === "connecter" ||
              aria.includes("connect") ||
              aria.includes("connecter")
            ) {
              connectBtn = el;
              break;
            }
          }
        }

        if (!connectBtn) {
          return { success: false, error: "Bouton Connecter non trouvé" };
        }

        connectBtn.click();
        await wait(2000);

        // Vérifier si un modal de connexion s'est ouvert
        // Si une note est fournie, la remplir dans le textarea
        if (noteText && noteText.trim()) {
          const noteSelectors = [
            'textarea#custom-message',
            'textarea.connect-button-send-invite__custom-message',
            'textarea[aria-label*="note" i]',
            'textarea[aria-label*="message" i]',
            'textarea[name*="message" i]',
            'textarea[id*="message" i]',
            'textarea[data-test-message-input]',
            'textarea'
          ];
          let noteArea = null;
          for (const sel of noteSelectors) {
            const el = document.querySelector(sel);
            if (el && isVisible(el)) {
              noteArea = el;
              break;
            }
          }

          if (noteArea) {
            noteArea.focus();
            noteArea.value = noteText.trim();
            noteArea.dispatchEvent(new Event("input", { bubbles: true }));
            noteArea.dispatchEvent(new Event("change", { bubbles: true }));
            await wait(500);
          }
        }

        // Chercher le bouton "Envoyer" / "Send" / "Envoyer sans note"
        const modalBtns = document.querySelectorAll(
          "button[aria-label], button"
        );
        for (const el of modalBtns) {
          if (!isVisible(el)) continue;
          const txt = (el.innerText || "").trim().toLowerCase();
          const aria = (el.getAttribute("aria-label") || "")
            .trim()
            .toLowerCase();
          if (
            txt === "send" ||
            txt === "envoyer" ||
            txt === "send without a note" ||
            txt === "envoyer sans note" ||
            txt.includes("envoyer") ||
            aria === "send now" ||
            aria === "envoyer"
          ) {
            el.click();
            await wait(1000);
            return { success: true, note_sent: !!noteText };
          }
        }

        return { success: true, note_sent: !!noteText }; // Connexion peut-être déjà envoyée directement
      }
    });

    const p1 = result?.[0]?.result;
    if (!p1?.success) {
      if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
      return {
        success: false,
        error: p1?.error || "Bouton Connecter non trouvé"
      };
    }

    if (p1?.stopped) {
      if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
      return { success: false, stopped: true };
    }

    setTimeout(() => {
      if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
    }, 2000);

    return { success: true };
  } catch (error) {
    if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
    return { success: false, error: error.message };
  }
}

// Envoyer un message à un profil (sous-fonction réutilisable)
// Retourne { success: true/false, error?: string }
async function sendMessageToProfile(profileUrl, messageText, actionId = null) {
  let tab;
  let newTab = null;

  try {
    tab = await openLinkedInTab(profileUrl);
    console.log("[SEND_TO_PROFILE] Profil ouvert, tab", tab.id);

    // === STOP CHECK: après ouverture du profil ===
    if (actionId) {
      const stopped = await checkIfActionStopped(actionId);
      if (stopped) {
        console.log(
          `[SEND_TO_PROFILE] Stop détecté après ouverture tab — annulation`
        );
        if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
        return {
          success: false,
          stopped: true,
          error: "Action arrêtée avant envoi"
        };
      }
    }

    // PHASE 1: Cliquer sur le bouton Message
    const tabsBefore = (await chrome.tabs.query({})).map((t) => t.id);

    const phase1 = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        function wait(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }
        function isVisible(el) {
          return el && el.offsetParent !== null;
        }

        for (let i = 0; i < 15; i++) {
          const h1 = document.querySelector("h1");
          if (h1 && h1.textContent.trim().length > 0) break;
          await wait(1000);
        }
        await wait(2000);

        const clickables = document.querySelectorAll(
          'button, a[role="button"], a[href*="messaging"], a'
        );
        let messageBtn = null;
        for (const el of clickables) {
          if (!isVisible(el)) continue;
          const txt = (el.innerText || "").trim().toLowerCase();
          const aria = (el.getAttribute("aria-label") || "")
            .trim()
            .toLowerCase();
          if (
            txt === "message" ||
            txt === "envoyer un message" ||
            aria === "message" ||
            aria.startsWith("envoyer un message") ||
            aria.startsWith("send a message")
          ) {
            messageBtn = el;
            break;
          }
        }
        if (!messageBtn) {
          for (const el of clickables) {
            if (!isVisible(el)) continue;
            const txt = (el.innerText || "").trim().toLowerCase();
            const aria = (el.getAttribute("aria-label") || "")
              .trim()
              .toLowerCase();
            const combined = txt + " " + aria;
            if (
              combined.includes("message") &&
              !combined.includes("demande") &&
              !combined.includes("signaler") &&
              !combined.includes("request")
            ) {
              messageBtn = el;
              break;
            }
          }
        }

        if (!messageBtn)
          return {
            success: false,
            error: "Bouton Message non trouvé sur le profil"
          };

        if (messageBtn.tagName === "A" && messageBtn.href) {
          window.location.href = messageBtn.href;
          return { success: true, method: "href_navigation" };
        }

        const rect = messageBtn.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const evtOpts = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          button: 0
        };
        messageBtn.dispatchEvent(new PointerEvent("pointerdown", evtOpts));
        messageBtn.dispatchEvent(new MouseEvent("mousedown", evtOpts));
        await wait(100);
        messageBtn.dispatchEvent(new PointerEvent("pointerup", evtOpts));
        messageBtn.dispatchEvent(new MouseEvent("mouseup", evtOpts));
        await wait(50);
        messageBtn.dispatchEvent(new MouseEvent("click", evtOpts));
        messageBtn.click();
        await wait(3000);

        const overlaysNow = document.querySelectorAll(
          "[class*='msg-overlay']"
        ).length;
        const ceNow = document.querySelectorAll(
          "[contenteditable='true']"
        ).length;
        if (overlaysNow === 0 && ceNow === 0) {
          const nearbyLinks =
            messageBtn
              .closest("section, div")
              ?.querySelectorAll("a[href*='messaging']") || [];
          for (const link of nearbyLinks) {
            if (link.href) {
              window.location.href = link.href;
              return { success: true, method: "nearby_link" };
            }
          }
        }
        return { success: true, method: "mouse_events" };
      }
    });

    const p1 = phase1?.[0]?.result;
    if (!p1?.success) {
      if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
      return {
        success: false,
        error: p1?.error || "Bouton Message non trouvé"
      };
    }

    // === STOP CHECK: après clic sur Message, avant navigation ===
    if (actionId) {
      const stopped = await checkIfActionStopped(actionId);
      if (stopped) {
        console.log(
          `[SEND_TO_PROFILE] Stop détecté après clic Message — annulation`
        );
        if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
        return {
          success: false,
          stopped: true,
          error: "Action arrêtée après clic Message"
        };
      }
    }

    // Attente détection navigation
    await new Promise((r) => setTimeout(r, 8000));
    const tabsAfter = await chrome.tabs.query({});
    const newTabs = tabsAfter.filter(
      (t) => !tabsBefore.includes(t.id) && t.id !== tab.id
    );
    let targetTabId = tab.id;
    const messagingTab = newTabs.find(
      (t) => t.url && t.url.includes("/messaging")
    );
    if (messagingTab) {
      targetTabId = messagingTab.id;
      newTab = messagingTab;
    } else {
      const updatedTab = await chrome.tabs.get(tab.id);
      if (updatedTab.url?.includes("/messaging")) {
        // Tab original a navigué vers messaging
      }
    }

    // Attendre chargement
    try {
      const targetTabInfo = await chrome.tabs.get(targetTabId);
      if (targetTabInfo.status !== "complete") {
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 10000);
          function listener(updatedId, changeInfo) {
            if (updatedId === targetTabId && changeInfo.status === "complete") {
              clearTimeout(timeout);
              chrome.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          }
          chrome.tabs.onUpdated.addListener(listener);
        });
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (e) {}

    // === STOP CHECK: avant la phase d'écriture du message ===
    if (actionId) {
      const stopped = await checkIfActionStopped(actionId);
      if (stopped) {
        console.log(
          `[SEND_TO_PROFILE] Stop détecté avant écriture message — annulation`
        );
        if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
        if (newTab?.id && newTab.id !== tab.id)
          chrome.tabs.remove(newTab.id).catch(() => {});
        return {
          success: false,
          stopped: true,
          error: "Action arrêtée avant écriture"
        };
      }
    }

    // PHASE 2: Écrire et envoyer le message
    const phase2 = await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: async (msgText) => {
        function wait(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }
        function isVisible(el) {
          return el && el.offsetParent !== null;
        }

        try {
          await wait(2000);
          let input = null;
          const inputSelectors = [
            "div.msg-form__contenteditable[contenteditable='true']",
            ".msg-form__contenteditable",
            ".msg-overlay-conversation-bubble div[contenteditable='true']",
            ".msg-form div[contenteditable='true']",
            "[contenteditable='true'][role='textbox']",
            "div[aria-label*='Rédigez'][contenteditable='true']",
            "div[aria-label*='message'][contenteditable='true']",
            "div[aria-label*='Write'][contenteditable='true']",
            "div[aria-label*='Écrivez'][contenteditable='true']",
            ".msg-form__message-texteditor div[contenteditable='true']"
          ];

          for (let attempt = 0; attempt < 20; attempt++) {
            for (const sel of inputSelectors) {
              try {
                const el = document.querySelector(sel);
                if (el && isVisible(el)) {
                  input = el;
                  break;
                }
              } catch (e) {}
            }
            if (input) break;
            const allEditable = document.querySelectorAll(
              "[contenteditable='true']"
            );
            for (const el of allEditable) {
              if (!isVisible(el)) continue;
              if (el.closest("[class*='msg-']")) {
                input = el;
                break;
              }
            }
            if (input) break;
            for (const el of allEditable) {
              if (!isVisible(el)) continue;
              if (
                el.closest(
                  ".artdeco-modal, [role='dialog'], [class*='overlay']"
                )
              ) {
                input = el;
                break;
              }
            }
            if (input) break;
            for (const el of allEditable) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 50 && rect.height > 20 && el.tagName === "DIV") {
                input = el;
                break;
              }
            }
            if (input) break;
            if (attempt >= 10) {
              for (const el of allEditable) {
                if (el.tagName === "DIV") {
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    input = el;
                    break;
                  }
                }
              }
              if (input) break;
            }
            await wait(1000);
          }

          if (!input)
            return { success: false, error: "Champ message introuvable" };

          input.focus();
          await wait(500);
          input.innerHTML = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await wait(300);
          document.execCommand("selectAll", false, null);
          document.execCommand("delete", false, null);

          // Insérer le texte ligne par ligne pour gérer les \n
          const lines = msgText.split("\n");
          for (let li = 0; li < lines.length; li++) {
            if (li > 0) {
              // Simuler Shift+Enter pour un retour à la ligne dans LinkedIn
              input.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "Enter",
                  code: "Enter",
                  keyCode: 13,
                  which: 13,
                  shiftKey: true,
                  bubbles: true
                })
              );
              document.execCommand("insertLineBreak");
            }
            if (lines[li].length > 0) {
              document.execCommand("insertText", false, lines[li]);
            }
          }
          input.dispatchEvent(new InputEvent("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
          await wait(2000);

          const written = (input.innerText || input.textContent || "").trim();
          if (!written || written.length < 3) {
            input.innerHTML = msgText
              .split("\n")
              .map((l) => "<p>" + (l || "<br>") + "</p>")
              .join("");
            input.dispatchEvent(new InputEvent("input", { bubbles: true }));
            await wait(1500);
          }

          let sendBtn = null;
          for (let i = 0; i < 15; i++) {
            sendBtn = document.querySelector("button.msg-form__send-button");
            if (sendBtn && isVisible(sendBtn)) break;
            sendBtn = null;
            for (const btn of document.querySelectorAll(
              "button[type='submit'], button"
            )) {
              if (!isVisible(btn)) continue;
              const txt = (btn.innerText || "").trim().toLowerCase();
              if (txt === "envoyer" || txt === "send") {
                sendBtn = btn;
                break;
              }
            }
            if (sendBtn) break;
            await wait(500);
          }

          if (!sendBtn)
            return { success: false, error: "Bouton Envoyer introuvable" };

          sendBtn.click();
          await wait(2500);
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message };
        }
      },
      args: [messageText]
    });

    const res = phase2?.[0]?.result;

    // Fermer les onglets
    setTimeout(() => {
      if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
      if (newTab?.id && newTab.id !== tab.id)
        chrome.tabs.remove(newTab.id).catch(() => {});
    }, 2000);

    return res || { success: false, error: "Pas de résultat phase 2" };
  } catch (error) {
    if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
    if (newTab?.id) chrome.tabs.remove(newTab.id).catch(() => {});
    return { success: false, error: error.message };
  }
}

// Envoyer un message — ARCHITECTURE 2 PHASES + DÉTECTION NOUVEL ONGLET
async function executeSendMessage(action) {
  let tab;
  let newTab = null;

  try {
    const payload =
      typeof action.payload === "string"
        ? JSON.parse(action.payload)
        : action.payload;

    const messageText = payload.message || "";

    // Ouvrir le profil LinkedIn
    tab = await openLinkedInTab(action.target_url);
    console.log("[SEND MSG] Profil ouvert, tab", tab.id);

    // =============================================
    // PHASE 1: Cliquer sur le bouton Message
    // =============================================
    // Écouter les nouveaux onglets AVANT de cliquer
    const tabsBefore = (await chrome.tabs.query({})).map((t) => t.id);
    console.log("[SEND MSG] Tabs avant clic:", tabsBefore.length);

    const phase1 = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        function wait(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }
        function isVisible(el) {
          return el && el.offsetParent !== null;
        }

        // Attendre le profil
        for (let i = 0; i < 15; i++) {
          const h1 = document.querySelector("h1");
          if (h1 && h1.textContent.trim().length > 0) break;
          await wait(1000);
        }
        await wait(2000);

        // Chercher bouton Message
        const clickables = document.querySelectorAll(
          'button, a[role="button"], a[href*="messaging"], a'
        );
        let messageBtn = null;
        for (const el of clickables) {
          if (!isVisible(el)) continue;
          const txt = (el.innerText || "").trim().toLowerCase();
          const aria = (el.getAttribute("aria-label") || "")
            .trim()
            .toLowerCase();
          if (
            txt === "message" ||
            txt === "envoyer un message" ||
            aria === "message" ||
            aria.startsWith("envoyer un message") ||
            aria.startsWith("send a message")
          ) {
            messageBtn = el;
            break;
          }
        }
        if (!messageBtn) {
          for (const el of clickables) {
            if (!isVisible(el)) continue;
            const txt = (el.innerText || "").trim().toLowerCase();
            const aria = (el.getAttribute("aria-label") || "")
              .trim()
              .toLowerCase();
            const combined = txt + " " + aria;
            if (
              combined.includes("message") &&
              !combined.includes("demande") &&
              !combined.includes("signaler") &&
              !combined.includes("request")
            ) {
              messageBtn = el;
              break;
            }
          }
        }

        if (!messageBtn) {
          return {
            success: false,
            error: "Bouton Message non trouvé sur le profil"
          };
        }

        const btnInfo = {
          tag: messageBtn.tagName,
          cls: (messageBtn.className || "").substring(0, 80),
          text: (messageBtn.innerText || "").trim().substring(0, 30),
          href: messageBtn.getAttribute("href") || "",
          isAnchor: messageBtn.tagName === "A"
        };

        // STRATÉGIE 1: Si c'est un <a> avec href → naviguer directement
        if (messageBtn.tagName === "A" && messageBtn.href) {
          console.log(
            "[AUTO MESSAGE] Navigation directe via href:",
            messageBtn.href
          );
          window.location.href = messageBtn.href;
          return {
            success: true,
            btnInfo,
            method: "href_navigation",
            urlBeforeClick: window.location.href
          };
        }

        // STRATÉGIE 2: Simuler des événements souris complets (pas juste .click())
        console.log("[AUTO MESSAGE] Simulation événements souris...");
        const rect = messageBtn.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const evtOpts = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          button: 0
        };

        messageBtn.dispatchEvent(new PointerEvent("pointerdown", evtOpts));
        messageBtn.dispatchEvent(new MouseEvent("mousedown", evtOpts));
        await wait(100);
        messageBtn.dispatchEvent(new PointerEvent("pointerup", evtOpts));
        messageBtn.dispatchEvent(new MouseEvent("mouseup", evtOpts));
        await wait(50);
        messageBtn.dispatchEvent(new MouseEvent("click", evtOpts));
        messageBtn.click();

        // Attendre 3s et vérifier si ça a fait quelque chose
        await wait(3000);
        const changed = window.location.href;
        const overlaysNow = document.querySelectorAll(
          "[class*='msg-overlay']"
        ).length;
        const ceNow = document.querySelectorAll(
          "[contenteditable='true']"
        ).length;

        // STRATÉGIE 3: Si rien n'a changé, chercher le href dans le bouton ou ses parents
        if (overlaysNow === 0 && ceNow === 0) {
          // Chercher un lien messaging dans le bouton ou autour
          const nearbyLinks =
            messageBtn
              .closest("section, div")
              ?.querySelectorAll("a[href*='messaging']") || [];
          for (const link of nearbyLinks) {
            if (link.href) {
              console.log(
                "[AUTO MESSAGE] Fallback: lien messaging trouvé:",
                link.href
              );
              window.location.href = link.href;
              return {
                success: true,
                btnInfo,
                method: "nearby_link",
                urlBeforeClick: changed
              };
            }
          }
        }

        return {
          success: true,
          btnInfo,
          method: "mouse_events",
          urlAfterClick: changed,
          overlaysAfterClick: overlaysNow,
          ceAfterClick: ceNow
        };
      }
    });

    const p1 = phase1?.[0]?.result;
    console.log("[SEND MSG] Phase 1 result:", p1);

    if (!p1?.success) {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        p1?.error || "Bouton Message non trouvé"
      );
      setTimeout(() => {
        if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
      }, 2000);
      return;
    }

    // =============================================
    // DÉTECTION: Attendre et vérifier ce qui s'est passé
    // =============================================
    console.log(
      "[SEND MSG] ⏳ Attente 8s pour détecter navigation ou nouvel onglet..."
    );
    await new Promise((r) => setTimeout(r, 8000));

    // Vérifier si un nouvel onglet a été ouvert
    const tabsAfter = await chrome.tabs.query({});
    const newTabs = tabsAfter.filter(
      (t) => !tabsBefore.includes(t.id) && t.id !== tab.id
    );
    console.log(
      "[SEND MSG] Tabs après clic:",
      tabsAfter.length,
      "Nouveaux:",
      newTabs.length
    );
    if (newTabs.length > 0) {
      console.log("[SEND MSG] 🆕 Nouveaux onglets détectés:");
      newTabs.forEach((t) => console.log("  →", t.id, t.url?.substring(0, 80)));
    }

    // Vérifier si l'onglet original a navigué
    const updatedTab = await chrome.tabs.get(tab.id);
    console.log(
      "[SEND MSG] Tab original URL maintenant:",
      updatedTab.url?.substring(0, 80)
    );

    // Déterminer le bon onglet pour Phase 2
    let targetTabId = tab.id;
    let targetUrl = updatedTab.url || "";

    // Cas 1: Un nouvel onglet messaging a été ouvert
    const messagingTab = newTabs.find(
      (t) => t.url && t.url.includes("/messaging")
    );
    if (messagingTab) {
      targetTabId = messagingTab.id;
      targetUrl = messagingTab.url;
      newTab = messagingTab;
      console.log(
        "[SEND MSG] ✅ Onglet messaging trouvé:",
        targetTabId,
        targetUrl.substring(0, 80)
      );
    }
    // Cas 2: L'onglet original a navigué vers messaging
    else if (targetUrl.includes("/messaging")) {
      console.log("[SEND MSG] ✅ Tab original a navigué vers messaging");
    }
    // Cas 3: Toujours sur le profil — popup overlay possible
    else {
      console.log("[SEND MSG] ⚠️ Toujours sur le profil. Popup overlay ?");
    }

    // Attendre que le tab cible soit complètement chargé
    try {
      const targetTabInfo = await chrome.tabs.get(targetTabId);
      if (targetTabInfo.status !== "complete") {
        console.log("[SEND MSG] ⏳ Attente chargement tab cible...");
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 10000);
          function listener(updatedId, changeInfo) {
            if (updatedId === targetTabId && changeInfo.status === "complete") {
              clearTimeout(timeout);
              chrome.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          }
          chrome.tabs.onUpdated.addListener(listener);
        });
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (e) {
      console.log("[SEND MSG] Tab check error:", e.message);
    }

    // =============================================
    // PHASE 2: Diagnostic + Trouver input + Écrire + Envoyer
    // =============================================
    console.log("[SEND MSG] Phase 2: injection sur tab", targetTabId);

    const phase2 = await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: async (msgText) => {
        function wait(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }
        function isVisible(el) {
          return el && el.offsetParent !== null;
        }
        function safeCls(el) {
          try {
            return typeof el.className === "string"
              ? el.className
              : el.className?.baseVal || el.getAttribute("class") || "";
          } catch (e) {
            return "";
          }
        }
        const logs = [];
        function log(...args) {
          const msg = args
            .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
            .join(" ");
          logs.push(msg);
          console.log("[AUTO MESSAGE]", ...args);
        }

        try {
          log("🚀 Phase 2 sur:", window.location.href);
          await wait(2000);

          // === DIAGNOSTIC ===
          const diag = {};
          diag.url = window.location.href;
          diag.isMessaging = diag.url.includes("/messaging");
          diag.isProfile = diag.url.includes("/in/");

          // msg-overlay elements
          const overlays = document.querySelectorAll("[class*='msg-overlay']");
          diag.msgOverlays = overlays.length;
          diag.overlayDetails = [...overlays].map((o, i) => ({
            cls: safeCls(o).substring(0, 80),
            visible: isVisible(o),
            children: o.children.length
          }));

          // msg-form elements
          const forms = document.querySelectorAll("[class*='msg-form']");
          diag.msgForms = forms.length;
          diag.formDetails = [...forms].map((f) => ({
            cls: safeCls(f).substring(0, 80),
            visible: isVisible(f),
            tag: f.tagName
          }));

          // ALL contenteditable
          const allCE = document.querySelectorAll("[contenteditable]");
          diag.ceTotal = allCE.length;
          diag.ceDetails = [...allCE].map((el) => {
            const rect = el.getBoundingClientRect();
            const styles = window.getComputedStyle(el);
            return {
              tag: el.tagName,
              ce: el.getAttribute("contenteditable"),
              visible: isVisible(el),
              display: styles.display,
              visibility: styles.visibility,
              opacity: styles.opacity,
              w: Math.round(rect.width),
              h: Math.round(rect.height),
              cls: safeCls(el).substring(0, 100),
              role: el.getAttribute("role") || "",
              aria: (el.getAttribute("aria-label") || "").substring(0, 50)
            };
          });

          // role=textbox
          const textboxes = document.querySelectorAll("[role='textbox']");
          diag.textboxes = textboxes.length;
          diag.textboxDetails = [...textboxes].map((el) => ({
            tag: el.tagName,
            visible: isVisible(el),
            cls: safeCls(el).substring(0, 80),
            ce: el.getAttribute("contenteditable")
          }));

          // iframes
          diag.iframes = document.querySelectorAll("iframe").length;

          // textareas
          const tas = document.querySelectorAll("textarea, input[type='text']");
          diag.textareas = tas.length;
          diag.textareaDetails = [...tas].map((el) => ({
            tag: el.tagName,
            visible: isVisible(el),
            cls: safeCls(el).substring(0, 60),
            placeholder: (el.getAttribute("placeholder") || "").substring(0, 40)
          }));

          log("📊 DIAGNOSTIC:", JSON.stringify(diag, null, 2));

          // === RECHERCHE DU CHAMP ===
          let input = null;

          const inputSelectors = [
            "div.msg-form__contenteditable[contenteditable='true']",
            ".msg-form__contenteditable",
            ".msg-overlay-conversation-bubble div[contenteditable='true']",
            ".msg-form div[contenteditable='true']",
            "[contenteditable='true'][role='textbox']",
            "div[aria-label*='Rédigez'][contenteditable='true']",
            "div[aria-label*='message'][contenteditable='true']",
            "div[aria-label*='Write'][contenteditable='true']",
            "div[aria-label*='Écrivez'][contenteditable='true']",
            ".msg-form__message-texteditor div[contenteditable='true']"
          ];

          for (let attempt = 0; attempt < 20; attempt++) {
            // Stratégie A: sélecteurs spécifiques
            for (const sel of inputSelectors) {
              try {
                const el = document.querySelector(sel);
                if (el && isVisible(el)) {
                  input = el;
                  log("✅ [A] Trouvé:", sel);
                  break;
                }
              } catch (e) {}
            }
            if (input) break;

            // Stratégie B: contenteditable dans parent msg-*
            const allEditable = document.querySelectorAll(
              "[contenteditable='true']"
            );
            for (const el of allEditable) {
              if (!isVisible(el)) continue;
              if (el.closest("[class*='msg-']")) {
                input = el;
                log("✅ [B] parent msg-*");
                break;
              }
            }
            if (input) break;

            // Stratégie C: dialog/modal/overlay
            for (const el of allEditable) {
              if (!isVisible(el)) continue;
              if (
                el.closest(
                  ".artdeco-modal, [role='dialog'], [class*='overlay']"
                )
              ) {
                input = el;
                log("✅ [C] modal/overlay");
                break;
              }
            }
            if (input) break;

            // Stratégie D: getBoundingClientRect > 0
            for (const el of allEditable) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 50 && rect.height > 20 && el.tagName === "DIV") {
                input = el;
                log("✅ [D] rect", rect.width, rect.height);
                break;
              }
            }
            if (input) break;

            // Stratégie E: n'importe quel div contenteditable avec rect > 0
            if (attempt >= 10) {
              for (const el of allEditable) {
                if (el.tagName === "DIV") {
                  const rect = el.getBoundingClientRect();
                  if (rect.width > 0 && rect.height > 0) {
                    input = el;
                    log("⚠️ [E] fallback rect>0");
                    break;
                  }
                }
              }
              if (input) break;
            }

            log(`⏳ Tentative ${attempt + 1}/20 — CE: ${allEditable.length}`);
            await wait(1000);
          }

          if (!input) {
            return { success: false, error: "Champ introuvable", diag, logs };
          }

          // === ÉCRIRE LE MESSAGE ===
          log("✍️ Écriture du message...");
          input.focus();
          await wait(500);
          input.innerHTML = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await wait(300);
          document.execCommand("selectAll", false, null);
          document.execCommand("delete", false, null);

          // Insérer le texte ligne par ligne pour gérer les \n
          const lines = msgText.split("\n");
          for (let li = 0; li < lines.length; li++) {
            if (li > 0) {
              input.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "Enter",
                  code: "Enter",
                  keyCode: 13,
                  which: 13,
                  shiftKey: true,
                  bubbles: true
                })
              );
              document.execCommand("insertLineBreak");
            }
            if (lines[li].length > 0) {
              document.execCommand("insertText", false, lines[li]);
            }
          }
          input.dispatchEvent(new InputEvent("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
          await wait(2000);

          const written = (input.innerText || input.textContent || "").trim();
          log("📝 Texte:", written.substring(0, 60));
          if (!written || written.length < 3) {
            input.innerHTML = msgText
              .split("\n")
              .map((l) => "<p>" + (l || "<br>") + "</p>")
              .join("");
            input.dispatchEvent(new InputEvent("input", { bubbles: true }));
            await wait(1500);
          }

          // === BOUTON ENVOYER ===
          let sendBtn = null;
          for (let i = 0; i < 15; i++) {
            sendBtn = document.querySelector("button.msg-form__send-button");
            if (sendBtn && isVisible(sendBtn)) break;
            sendBtn = null;
            for (const btn of document.querySelectorAll(
              "button[type='submit'], button"
            )) {
              if (!isVisible(btn)) continue;
              const txt = (btn.innerText || "").trim().toLowerCase();
              if (txt === "envoyer" || txt === "send") {
                sendBtn = btn;
                break;
              }
            }
            if (sendBtn) break;
            await wait(500);
          }

          if (!sendBtn) {
            return {
              success: false,
              error: "Bouton Envoyer introuvable",
              logs
            };
          }

          log("✅ Envoi...");
          sendBtn.click();
          await wait(2500);

          log("🎉 MESSAGE ENVOYÉ!");
          return { success: true, logs };
        } catch (e) {
          log("💥 ERREUR:", e.message);
          return { success: false, error: e.message, logs };
        }
      },
      args: [messageText]
    });

    const res = phase2?.[0]?.result;

    // AFFICHER TOUS LES LOGS ET DIAGNOSTICS DANS LA CONSOLE BACKGROUND.JS
    console.log("[SEND MSG] ====== RÉSULTAT PHASE 2 ======");
    if (res?.logs) {
      console.log("[SEND MSG] Logs de la page LinkedIn:");
      res.logs.forEach((l) => console.log("  →", l));
    }
    if (res?.diag) {
      console.log("[SEND MSG] 🔬 DIAGNOSTIC COMPLET:");
      console.log("  URL:", res.diag.url);
      console.log("  isMessaging:", res.diag.isMessaging);
      console.log("  isProfile:", res.diag.isProfile);
      console.log("  msg-overlay:", res.diag.msgOverlays);
      if (res.diag.overlayDetails)
        res.diag.overlayDetails.forEach((o) => console.log("    overlay:", o));
      console.log("  msg-form:", res.diag.msgForms);
      if (res.diag.formDetails)
        res.diag.formDetails.forEach((f) => console.log("    form:", f));
      console.log("  contenteditable total:", res.diag.ceTotal);
      if (res.diag.ceDetails)
        res.diag.ceDetails.forEach((c, i) => console.log(`    CE[${i}]:`, c));
      console.log("  role=textbox:", res.diag.textboxes);
      if (res.diag.textboxDetails)
        res.diag.textboxDetails.forEach((t) => console.log("    textbox:", t));
      console.log("  iframes:", res.diag.iframes);
      console.log("  textarea/input:", res.diag.textareas);
      if (res.diag.textareaDetails)
        res.diag.textareaDetails.forEach((t) => console.log("    input:", t));
    }
    console.log("[SEND MSG] Succès:", res?.success, "Erreur:", res?.error);
    console.log("[SEND MSG] ============================");

    if (res?.success) {
      await updateActionStatus(action.id, "completed", { sent: true });
      // Marquer le prospect comme 'contacted' (= message envoyé)
      try {
        await fetch(`${API_BASE_URL}/prospects/update-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkedin_url: action.target_url,
            status: "contacted"
          })
        });
        console.log(
          `[SEND_MSG] ✅ ${action.target_name || action.target_url} → status 'contacted'`
        );
      } catch (e) {
        console.log(`[SEND_MSG] ⚠️ Erreur update status: ${e.message}`);
      }
    } else {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        res?.error || "Erreur inconnue"
      );
    }

    // Fermer les onglets après 3s
    setTimeout(() => {
      if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
      if (newTab?.id && newTab.id !== tab.id)
        chrome.tabs.remove(newTab.id).catch(() => {});
    }, 3000);
  } catch (error) {
    console.error("❌ executeSendMessage error:", error);
    if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
    if (newTab?.id) chrome.tabs.remove(newTab.id).catch(() => {});
    await updateActionStatus(action.id, "failed", null, error.message);
  }
}

// Vérifier si une action a été arrêtée par l'utilisateur
async function checkIfActionStopped(actionId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/linkedin-actions?id=${actionId}&_t=${Date.now()}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      console.log(`[STOP_CHECK] Action #${actionId}: HTTP ${response.status}`);
      return false;
    }
    const data = await response.json();
    const action = data.actions?.[0];
    const isStopped = action?.status === "stopped";
    if (isStopped) {
      console.log(
        `[STOP_CHECK] ✅ Action #${actionId} EST ARRÊTÉE — stop détecté !`
      );
    }
    return isStopped;
  } catch (e) {
    console.log("[STOP_CHECK] Erreur vérification stop:", e.message);
    return false;
  }
}

// Mettre à jour le statut d'une action via l'API
// Retourne true si la mise à jour a réussi, false sinon
async function updateActionStatus(
  actionId,
  status,
  result = null,
  errorMessage = null
) {
  try {
    const resp = await apiFetch(`${API_BASE_URL}/linkedin-actions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: actionId,
        status,
        result: result || {},
        error_message: errorMessage
      })
    });
    if (resp.ok) {
      const data = await resp.json();
      // Vérifier si le statut a réellement été mis à jour
      if (data.action?.status !== status) {
        console.warn(
          `[UPDATE] Action #${actionId}: statut demandé "${status}" mais DB a "${data.action?.status}" — probablement arrêtée par l'utilisateur`
        );
        return false;
      }
      return true;
    }
    console.warn(`[UPDATE] Action #${actionId}: réponse HTTP ${resp.status}`);
    return false;
  } catch (error) {
    console.error("Failed to update action status:", error);
    return false;
  }
}

// Gérer les données de profil reçues du content script
async function handleProfileData(profileData, actionId) {
  await updateActionStatus(actionId, "completed", { profile: profileData });
}

// Gérer les résultats de recherche reçus du content script
// NOTE: Le scraping NE sauvegarde PAS les prospects en DB.
// Les prospects sont uniquement créés quand une vraie action (send_connection / send_message) est exécutée.
async function handleSearchResults(searchResults, actionId) {
  if (searchResults && searchResults.length > 0) {
    console.log(
      `[Extension] Recherche #${actionId} terminée — ${searchResults.length} profil(s) trouvé(s) (non sauvegardés en DB)`
    );
    await updateActionStatus(actionId, "completed", {
      profiles: searchResults,
      count: searchResults.length
    });
  } else {
    await updateActionStatus(actionId, "completed", {
      profiles: [],
      message: "Aucun résultat trouvé"
    });
  }
}

// Attendre que l'onglet soit complètement chargé
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(id, changeInfo) {
      if (id === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
    // Timeout de sécurité 15s
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 15000);
  });
}

// Mettre à jour le badge de l'extension
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: "#3B82F6" });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// =============================================
// CAPTURE AUTOMATIQUE DU COOKIE LinkedIn li_at
// =============================================
async function captureLinkedInCookie() {
  try {
    // Lire le cookie li_at depuis le store Chrome
    const cookie = await chrome.cookies.get({
      url: "https://www.linkedin.com",
      name: "li_at"
    });

    if (!cookie || !cookie.value) {
      console.warn(
        "[LinkedIn Agent] Cookie li_at non trouvé. Connectez-vous d'abord sur linkedin.com"
      );
      return {
        success: false,
        error:
          "Cookie li_at non trouvé. Ouvrez linkedin.com et connectez-vous d'abord."
      };
    }

    console.log("[LinkedIn Agent] Cookie li_at capturé avec succès");

    // Envoyer le cookie au backend
    const response = await fetch(`${API_BASE_URL}/linkedin-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "cookie",
        cookie: cookie.value,
        name: "",
        email: ""
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(
        errData.error || "Erreur serveur lors de la sauvegarde du cookie"
      );
    }

    const data = await response.json();
    console.log("[LinkedIn Agent] Cookie sauvegardé en base de données:", data);

    return { success: true, message: "Compte LinkedIn connecté avec succès !" };
  } catch (error) {
    console.error("[LinkedIn Agent] Erreur capture cookie:", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la capture du cookie"
    };
  }
}

// Utilitaire de délai
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Délai interruptible — vérifie le stop toutes les 5s pendant l'attente
// Retourne true si l'action a été arrêtée pendant le délai
async function interruptibleDelay(ms, actionId) {
  const checkInterval = 5000; // Vérifier toutes les 5 secondes
  let elapsed = 0;
  while (elapsed < ms) {
    const waitTime = Math.min(checkInterval, ms - elapsed);
    await delay(waitTime);
    elapsed += waitTime;
    // Vérifier si l'utilisateur a cliqué Stop
    const wasStopped = await checkIfActionStopped(actionId);
    if (wasStopped) {
      console.log(
        `[DELAY] Action #${actionId} arrêtée pendant le délai (après ${Math.round(elapsed / 1000)}s)`
      );
      return true; // Arrêtée !
    }
  }
  return false; // Pas arrêtée
}
