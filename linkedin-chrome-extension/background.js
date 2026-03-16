// Configuration
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
  send_connection: [90000, 120000], // 1m30 à 2min
  send_message: [60000, 90000], // 1min à 1m30
  visit_profile: [15000, 30000], // 15s à 30s
  search: [30000, 45000], // 30s à 45s
  default: [10000, 20000] // 10s à 20s
};

// Limites journalières LinkedIn (conservatives)
const DAILY_LIMITS = {
  send_connection: 20,
  send_message: 50,
  visit_profile: 80,
  search: 30
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
    });
    return true;
  }

  if (message.type === "SEARCH_RESULTS") {
    // Résultats de recherche envoyés par le content script
    handleSearchResults(message.data, message.actionId).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "ACTION_COMPLETED") {
    updateActionStatus(message.actionId, "completed", message.result).then(
      () => {
        sendResponse({ success: true });
      }
    );
    return true;
  }

  if (message.type === "ACTION_FAILED") {
    updateActionStatus(message.actionId, "failed", null, message.error).then(
      () => {
        sendResponse({ success: true });
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
        if (isLimitReached(action.action_type)) {
          await updateActionStatus(
            action.id,
            "failed",
            null,
            `Limite journalière atteinte pour "${action.action_type}".`
          );
          continue;
        }
        await executeAction(action);
        incrementCounter(action.action_type);
        const waitMs = getRandomDelay(action.action_type);
        console.log(
          `[LinkedIn Guard] Attente de ${Math.round(waitMs / 1000)}s avant la prochaine action...`
        );
        await delay(waitMs);
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

// Exécuter une action spécifique
async function executeAction(action) {
  console.log(`Executing action: ${action.action_type} (ID: ${action.id})`);

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
    default:
      await updateActionStatus(
        action.id,
        "failed",
        null,
        `Type d'action inconnu: ${action.action_type}`
      );
  }
}

// Exécuter une recherche LinkedIn
async function executeSearch(action) {
  try {
    const tab = await getLinkedInTab();
    if (!tab) {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        "Aucun onglet LinkedIn ouvert. Ouvrez LinkedIn d'abord."
      );
      return;
    }

    // Naviguer vers l'URL de recherche
    await chrome.tabs.update(tab.id, { url: action.target_url });
    await delay(3000); // Attendre le chargement

    // Demander au content script de scraper les résultats
    chrome.tabs.sendMessage(tab.id, {
      type: "SCRAPE_SEARCH_RESULTS",
      actionId: action.id,
      payload: action.payload
    });
  } catch (error) {
    await updateActionStatus(action.id, "failed", null, error.message);
  }
}

// Visiter un profil LinkedIn
async function executeVisitProfile(action) {
  try {
    const tab = await getLinkedInTab();
    if (!tab) {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        "Aucun onglet LinkedIn ouvert."
      );
      return;
    }

    await chrome.tabs.update(tab.id, { url: action.target_url });
    await delay(3000);

    // Demander au content script de scraper le profil
    chrome.tabs.sendMessage(tab.id, {
      type: "SCRAPE_PROFILE",
      actionId: action.id
    });
  } catch (error) {
    await updateActionStatus(action.id, "failed", null, error.message);
  }
}

// Envoyer une demande de connexion
async function executeSendConnection(action) {
  try {
    const tab = await getLinkedInTab();
    if (!tab) {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        "Aucun onglet LinkedIn ouvert."
      );
      return;
    }

    // Naviguer vers le profil
    await chrome.tabs.update(tab.id, { url: action.target_url });
    await delay(3000);

    const payload =
      typeof action.payload === "string"
        ? JSON.parse(action.payload)
        : action.payload;

    // Demander au content script d'envoyer la connexion
    chrome.tabs.sendMessage(tab.id, {
      type: "SEND_CONNECTION",
      actionId: action.id,
      note: payload.note || ""
    });
  } catch (error) {
    await updateActionStatus(action.id, "failed", null, error.message);
  }
}

// Envoyer un message direct
async function executeSendMessage(action) {
  try {
    const tab = await getLinkedInTab();
    if (!tab) {
      await updateActionStatus(
        action.id,
        "failed",
        null,
        "Aucun onglet LinkedIn ouvert."
      );
      return;
    }

    // Naviguer vers la page de messaging du profil
    const messagingUrl =
      action.target_url.replace("/in/", "/messaging/thread/new/") ||
      action.target_url;
    await chrome.tabs.update(tab.id, { url: action.target_url });
    await delay(3000);

    const payload =
      typeof action.payload === "string"
        ? JSON.parse(action.payload)
        : action.payload;

    // Demander au content script d'envoyer le message
    chrome.tabs.sendMessage(tab.id, {
      type: "SEND_MESSAGE",
      actionId: action.id,
      message: payload.message || ""
    });
  } catch (error) {
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
  await updateActionStatus(actionId, "completed", { profiles: searchResults });
}

// Trouver un onglet LinkedIn existant
async function getLinkedInTab() {
  const tabs = await chrome.tabs.query({ url: "https://www.linkedin.com/*" });
  return tabs.length > 0 ? tabs[0] : null;
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
