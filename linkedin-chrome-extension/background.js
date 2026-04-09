// Configuration — v2.4 (2026-04-09)
console.log("[Extension] background.js v2.4 chargé");
const DEFAULT_API_BASE_URL = "http://localhost:3000/api";
let API_BASE_URL = DEFAULT_API_BASE_URL;

// Charger l'URL serveur depuis le storage au démarrage
chrome.storage.local.get(["serverUrl"], (result) => {
  if (result.serverUrl) {
    API_BASE_URL = result.serverUrl.replace(/\/$/, "") + "/api";
    console.log("[Config] Serveur configuré:", API_BASE_URL);
  }
});

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
  default: [10000, 20000] // 10s à 20s
};

// Limites journalières LinkedIn (conservatives)
const DAILY_LIMITS = {
  send_connection: 20,
  send_message: 30,
  visit_profile: 50,
  search: 25,
  search_and_message: 15
};

// Compteurs journaliers — réinitialisés à minuit
let dailyCounters = {};
let lastResetDate = new Date().toDateString();

function getRandomDelay(actionType) {
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

// Initialiser l'alarme de polling
chrome.alarms.create("pollActions", { periodInMinutes: 0.2 }); // Toutes les 12 secondes

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "pollActions" && !isProcessing) {
    await pollAndExecuteActions();
  }
});

// Écouter les messages du popup et content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATUS") {
    sendResponse({ isProcessing, isConnected });
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
    if (searchAndMessageActionIds.has(message.actionId)) {
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
    if (searchAndMessageActionIds.has(message.actionId)) {
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
});

// Récupérer et exécuter les actions APPROUVÉES (statut = 'approved')
async function pollAndExecuteActions() {
  if (isProcessing) return;

  try {
    // IMPORTANT: Ne récupérer que les actions avec statut 'approved' (approuvées par l'utilisateur)
    const response = await fetch(
      `${API_BASE_URL}/linkedin-actions?status=approved&limit=5`
    );

    if (!response.ok) {
      isConnected = false;
      return;
    }

    isConnected = true;
    const data = await response.json();

    if (!data.success || !data.actions || data.actions.length === 0) {
      // Aucune action approuvée en attente
      updateBadge(0);
      return;
    }

    isProcessing = true;
    updateBadge(data.actions.length);

    for (const action of data.actions) {
      try {
        // Note: le rate limiting est géré côté backend (rate-limiter.ts)
        // L'extension se contente d'exécuter les actions approuvées et d'appliquer des délais anti-ban
        await executeAction(action);
        // check_connection est silencieux — pas de délai
        if (action.action_type !== "check_connection") {
          const waitMs = getRandomDelay(action.action_type);
          console.log(
            `[LinkedIn Guard] Attente de ${Math.round(waitMs / 1000)}s avant la prochaine action...`
          );
          await delay(waitMs);
        }
      } catch (error) {
        console.error(`Error executing action ${action.id}:`, error);
        await updateActionStatus(action.id, "failed", null, error.message);
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

  // Marquer l'action comme "processing"
  await updateActionStatus(action.id, "processing");

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
    const payload =
      typeof action.payload === "string"
        ? JSON.parse(action.payload)
        : action.payload;
    const messageTemplate = payload.message_template || "";

    if (!messageTemplate) {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        "Pas de message_template dans le payload"
      );
      return;
    }

    console.log("[SEARCH&MSG] === DÉBUT === Action #" + action.id);
    console.log("[SEARCH&MSG] URL:", action.target_url);
    console.log("[SEARCH&MSG] Template:", messageTemplate.substring(0, 80));

    // =============================================
    // PHASE 1: RECHERCHE — ouvrir la page et scraper les profils
    // =============================================
    searchTab = await openLinkedInTab(action.target_url);
    await delay(2000);
    await ensureContentScript(searchTab.id);

    // Attendre les résultats de recherche via le content script
    const profiles = await new Promise((resolve, reject) => {
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

    // Sauvegarder les prospects en DB
    try {
      await fetch(`${API_BASE_URL}/prospects/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospects: profiles,
          source: "linkedin_search",
          search_action_id: action.id
        })
      });
    } catch (e) {
      console.log(
        "[SEARCH&MSG] Erreur sauvegarde prospects (non bloquante):",
        e.message
      );
    }

    // =============================================
    // PHASE 2: ENVOYER UN MESSAGE À CHAQUE PROFIL
    // =============================================
    // Marquer l'action comme "en cours" pendant l'envoi des messages
    await updateActionStatus(action.id, "processing", null, null);

    let messagesSent = 0;
    let messagesFailed = 0;
    const results = [];

    for (let i = 0; i < profiles.length; i++) {
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

      // Délai anti-ban entre les messages (sauf le premier)
      if (i > 0) {
        const msgDelay = getRandomDelay("send_message");
        console.log(
          `[SEARCH&MSG] Attente ${Math.round(msgDelay / 1000)}s avant prochain message...`
        );
        await delay(msgDelay);
      }

      // Envoyer le message en utilisant executeSendMessage en interne
      try {
        const sendResult = await sendMessageToProfile(
          profile.linkedin_url,
          personalizedMessage
        );
        if (sendResult.success) {
          messagesSent++;
          results.push({ name: profile.name, status: "sent" });
          console.log(`[SEARCH&MSG] ✅ Message envoyé à ${profile.name}`);
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
    }

    // =============================================
    // RÉSULTAT FINAL: completed si au moins 1 message envoyé
    // =============================================
    console.log(
      `[SEARCH&MSG] === FIN === Envoyés: ${messagesSent}, Échoués: ${messagesFailed}`
    );

    if (messagesSent > 0) {
      await updateActionStatus(action.id, "completed", {
        profiles_found: profiles.length,
        messages_sent: messagesSent,
        messages_failed: messagesFailed,
        details: results
      });
    } else {
      await updateActionStatus(
        action.id,
        "failed",
        {
          profiles_found: profiles.length,
          messages_sent: 0,
          messages_failed: messagesFailed,
          details: results
        },
        `Aucun message envoyé (${profiles.length} profils trouvés, ${messagesFailed} échecs)`
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
  }
}

// Envoyer un message à un profil (sous-fonction réutilisable)
// Retourne { success: true/false, error?: string }
async function sendMessageToProfile(profileUrl, messageText) {
  let tab;
  let newTab = null;

  try {
    tab = await openLinkedInTab(profileUrl);
    console.log("[SEND_TO_PROFILE] Profil ouvert, tab", tab.id);

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
          document.execCommand("insertText", false, msgText);
          input.dispatchEvent(new InputEvent("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
          await wait(2000);

          const written = (input.innerText || input.textContent || "").trim();
          if (!written || written.length < 3) {
            input.innerHTML = "<p>" + msgText + "</p>";
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
          document.execCommand("insertText", false, msgText);
          input.dispatchEvent(new InputEvent("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
          await wait(2000);

          const written = (input.innerText || input.textContent || "").trim();
          log("📝 Texte:", written.substring(0, 60));
          if (!written || written.length < 3) {
            input.innerHTML = "<p>" + msgText + "</p>";
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

// Mettre à jour le statut d'une action via l'API
async function updateActionStatus(
  actionId,
  status,
  result = null,
  errorMessage = null
) {
  try {
    await fetch(`${API_BASE_URL}/linkedin-actions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: actionId,
        status,
        result: result || {},
        error_message: errorMessage
      })
    });
  } catch (error) {
    console.error("Failed to update action status:", error);
  }
}

// Gérer les données de profil reçues du content script
async function handleProfileData(profileData, actionId) {
  await updateActionStatus(actionId, "completed", { profile: profileData });
}

// Gérer les résultats de recherche reçus du content script
async function handleSearchResults(searchResults, actionId) {
  // Sauvegarder les profils comme prospects dans la DB
  if (searchResults && searchResults.length > 0) {
    try {
      const response = await fetch(`${API_BASE_URL}/prospects/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospects: searchResults,
          source: "linkedin_search",
          search_action_id: actionId
        })
      });
      const data = await response.json();
      console.log(
        `[Extension] ${data.saved_count || 0} prospects sauvegardés en DB depuis la recherche #${actionId}`
      );
      await updateActionStatus(actionId, "completed", {
        profiles: searchResults,
        saved_to_db: data.saved_count || 0,
        skipped: data.skipped_count || 0
      });
    } catch (err) {
      console.error("[Extension] Erreur sauvegarde prospects:", err);
      await updateActionStatus(actionId, "completed", {
        profiles: searchResults,
        save_error: err.message
      });
    }
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
