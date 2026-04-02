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
let activeActionTabId = null; // onglet ouvert pour l'action en cours

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
        if (
          action.action_type !== "check_connection" &&
          isLimitReached(action.action_type)
        ) {
          await updateActionStatus(
            action.id,
            "failed",
            null,
            `Limite journalière atteinte pour "${action.action_type}".`
          );
          continue;
        }
        await executeAction(action);
        // check_connection est silencieux — pas de délai ni de compteur
        if (action.action_type !== "check_connection") {
          incrementCounter(action.action_type);
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
    await ensureContentScript(tab.id);
    chrome.tabs.sendMessage(tab.id, {
      type: "SCRAPE_SEARCH_RESULTS",
      actionId: action.id,
      payload: action.payload
    });
  } catch (error) {
    if (tab) chrome.tabs.remove(tab.id).catch(() => {});
    await updateActionStatus(action.id, "failed", null, error.message);
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

// Envoyer un message direct — GESTION POPUP OVERLAY
async function executeSendMessage(action) {
  let tab;

  try {
    const payload =
      typeof action.payload === "string"
        ? JSON.parse(action.payload)
        : action.payload;

    const messageText = payload.message || "";

    // Ouvrir le profil LinkedIn
    tab = await openLinkedInTab(action.target_url);
    console.log("[SEND MSG] Profil ouvert, tab", tab.id);

    // Injection UNIQUE : cliquer Message + attendre popup + écrire + envoyer
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (msgText) => {
        function wait(ms) {
          return new Promise((r) => setTimeout(r, ms));
        }
        function isVisible(el) {
          return el && el.offsetParent !== null;
        }
        function log(...args) {
          console.log("[AUTO MESSAGE]", ...args);
        }

        try {
          log("🚀 START: Recherche bouton Message sur", window.location.href);

          // ========================================
          // ÉTAPE 1: Attendre le profil et cliquer Message
          // ========================================
          for (let i = 0; i < 15; i++) {
            const h1 = document.querySelector("h1");
            if (h1 && h1.textContent.trim().length > 0) break;
            await wait(1000);
          }
          await wait(2000);

          // Chercher bouton Message
          const clickables = document.querySelectorAll(
            'button, a[role="button"], a[href*="messaging"]'
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
          // Fallback: match partiel
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

          log("✅ Bouton Message trouvé, click...");
          messageBtn.click();

          // ========================================
          // ÉTAPE 2: Attendre que le popup overlay apparaisse (3-5s)
          // ========================================
          log("⏳ Attente du popup overlay...");
          await wait(4000);

          // ========================================
          // ÉTAPE 3: Trouver le champ contenteditable dans le popup
          // ========================================
          log("🔍 Recherche du champ de saisie dans le popup...");
          let input = null;

          // Sélecteurs ultra-larges basés sur les screenshots
          const inputSelectors = [
            // Sélecteurs exacts des screenshots
            "div.msg-form__contenteditable.t-14.t-black.t-normal[contenteditable='true']",
            "div.msg-form__contenteditable[contenteditable='true']",
            "div[role='textbox'][contenteditable='true']",
            // Sélecteurs génériques
            ".msg-form__msg-content-container [contenteditable='true']",
            ".msg-overlay-conversation-bubble [contenteditable='true']",
            ".msg-form [contenteditable='true']",
            "div[aria-label*='Rédigez'][contenteditable='true']",
            "div[aria-label*='message'][contenteditable='true']",
            "div[aria-label*='Write'][contenteditable='true']",
            "div[data-placeholder*='message'][contenteditable='true']"
          ];

          for (let attempt = 0; attempt < 25; attempt++) {
            // Essayer chaque sélecteur spécifique
            for (const sel of inputSelectors) {
              try {
                const el = document.querySelector(sel);
                if (el && isVisible(el)) {
                  input = el;
                  log("✅ Champ trouvé avec sélecteur:", sel);
                  break;
                }
              } catch (e) {}
            }
            if (input) break;

            // Fallback 1: chercher dans les éléments avec classe msg-*
            const allEditable = document.querySelectorAll(
              "[contenteditable='true']"
            );
            for (const el of allEditable) {
              if (!isVisible(el)) continue;
              const parent = el.closest("[class*='msg-']");
              if (parent) {
                input = el;
                log(
                  "✅ Champ trouvé via parent msg-*:",
                  el.className.substring(0, 60)
                );
                break;
              }
            }
            if (input) break;

            // Fallback 2: chercher dans artdeco-modal (popup LinkedIn)
            for (const el of allEditable) {
              if (!isVisible(el)) continue;
              const modal = el.closest(
                ".artdeco-modal, [role='dialog'], .msg-overlay-bubble-extension"
              );
              if (modal) {
                input = el;
                log(
                  "✅ Champ trouvé dans modal/dialog:",
                  el.className.substring(0, 60)
                );
                break;
              }
            }
            if (input) break;

            // Fallback 3: après 15 tentatives, prendre N'IMPORTE QUEL div contenteditable visible
            if (attempt >= 15) {
              for (const el of allEditable) {
                if (isVisible(el) && el.tagName === "DIV") {
                  input = el;
                  log(
                    "⚠️ Champ trouvé via fallback ultime (premier div contenteditable visible):",
                    el.className.substring(0, 60)
                  );
                  break;
                }
              }
              if (input) break;
            }

            log(`⏳ Recherche champ... tentative ${attempt + 1}/25`);
            await wait(800);
          }

          if (!input) {
            // Debug: lister TOUS les contenteditable
            const allCE = [
              ...document.querySelectorAll("[contenteditable='true']")
            ].map((el) => {
              const vis = isVisible(el) ? "VISIBLE" : "HIDDEN";
              const cls = (el.className || "no-class").substring(0, 80);
              const aria = el.getAttribute("aria-label") || "";
              return `[${vis}] class="${cls}" aria="${aria.substring(0, 40)}"`;
            });
            log(
              "❌ AUCUN champ trouvé après 25 tentatives. ContentEditable sur la page:",
              allCE
            );
            return {
              success: false,
              error: `Champ introuvable après 25 tentatives. URL: ${window.location.href.substring(0, 60)}. ContentEditable: ${allCE.join(" | ")}`
            };
          }

          // ========================================
          // ÉTAPE 4: Écrire le message
          // ========================================
          log("✍️ Écriture du message...");
          input.focus();
          await wait(500);

          // Vider
          input.innerHTML = "";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          await wait(300);

          // Écrire via execCommand
          document.execCommand("selectAll", false, null);
          document.execCommand("delete", false, null);
          document.execCommand("insertText", false, msgText);

          // Événements pour LinkedIn
          input.dispatchEvent(new InputEvent("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
          await wait(2000);

          // Vérifier que le texte est bien écrit
          const written = (input.innerText || input.textContent || "").trim();
          log("📝 Texte écrit:", written.substring(0, 60));
          if (!written || written.length < 3) {
            log("⚠️ Texte vide ou trop court, retry avec innerHTML...");
            input.innerHTML = `<p>${msgText}</p>`;
            input.dispatchEvent(new InputEvent("input", { bubbles: true }));
            await wait(1500);
          }

          // ========================================
          // ÉTAPE 5: Trouver et cliquer le bouton Envoyer
          // ========================================
          log("🔍 Recherche bouton Envoyer...");
          let sendBtn = null;

          for (let i = 0; i < 20; i++) {
            // Sélecteur exact des screenshots
            sendBtn = document.querySelector(
              "button.msg-form__send-button[type='submit']"
            );
            if (sendBtn && isVisible(sendBtn)) break;

            // Fallback: classe msg-form__send-button sans type
            sendBtn = document.querySelector("button.msg-form__send-button");
            if (sendBtn && isVisible(sendBtn)) break;

            // Fallback: chercher par texte "Envoyer" / "Send"
            for (const btn of document.querySelectorAll("button")) {
              if (!isVisible(btn)) continue;
              const txt = (btn.innerText || "").trim().toLowerCase();
              const aria = (btn.getAttribute("aria-label") || "")
                .trim()
                .toLowerCase();
              if (
                txt === "envoyer" ||
                txt === "send" ||
                aria.includes("send") ||
                aria.includes("envoyer")
              ) {
                sendBtn = btn;
                break;
              }
            }
            if (sendBtn) break;

            log(`⏳ Recherche bouton envoyer... tentative ${i + 1}/20`);
            await wait(500);
          }

          if (!sendBtn) {
            const allBtns = [...document.querySelectorAll("button")]
              .filter((b) => isVisible(b))
              .map(
                (b) =>
                  `"${(b.innerText || "").trim().substring(0, 30)}" class="${(b.className || "").substring(0, 50)}"`
              )
              .slice(0, 15);
            log("❌ Bouton Envoyer introuvable. Boutons visibles:", allBtns);
            return {
              success: false,
              error:
                "Bouton Envoyer introuvable. Boutons: " + allBtns.join(" | ")
            };
          }

          log("✅ Bouton Envoyer trouvé, envoi...");
          sendBtn.click();
          sendBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          await wait(2500);

          log("🎉 MESSAGE ENVOYÉ avec succès!");
          return { success: true };
        } catch (e) {
          log("💥 ERREUR:", e.message, e.stack);
          return { success: false, error: e.message };
        }
      },
      args: [messageText]
    });

    const res = result?.[0]?.result;
    console.log("[SEND MSG] Résultat final:", res);

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

    // Fermer l'onglet après 3s
    setTimeout(() => {
      if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
    }, 3000);
  } catch (error) {
    console.error("❌ executeSendMessage error:", error);
    if (tab?.id) chrome.tabs.remove(tab.id).catch(() => {});
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
