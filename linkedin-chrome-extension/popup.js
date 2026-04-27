const DEFAULT_SERVER_URL = "http://localhost:3000";
let API_BASE_URL = DEFAULT_SERVER_URL + "/api";
let SERVER_URL = DEFAULT_SERVER_URL;

// Charger l'URL depuis le storage
chrome.storage.local.get(["serverUrl"], (result) => {
  if (result.serverUrl) {
    SERVER_URL = result.serverUrl.replace(/\/$/, "");
    API_BASE_URL = SERVER_URL + "/api";
  }
  const input = document.getElementById("serverUrlInput");
  if (input) input.value = SERVER_URL;
});

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["serverUrl"], (result) => {
    if (result.serverUrl) {
      SERVER_URL = result.serverUrl.replace(/\/$/, "");
      API_BASE_URL = SERVER_URL + "/api";
    }
    const input = document.getElementById("serverUrlInput");
    if (input) input.value = SERVER_URL;
    refreshData();
    refreshLinkedInAccount();
  });

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshData();
      refreshLinkedInAccount();
      chrome.runtime.sendMessage({ type: "MANUAL_POLL" });
    });
  }

  const openDashboardBtn = document.getElementById("openDashboardBtn");
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: SERVER_URL });
    });
  }

  const liAccountBtn = document.getElementById("liAccountBtn");
  if (liAccountBtn)
    liAccountBtn.addEventListener("click", async () => {
      console.log("[LinkedIn Agent] >>> Bouton Connecter cliqué");
      const btn = document.getElementById("liAccountBtn");
      const text = document.getElementById("liAccountText");
      console.log("[LinkedIn Agent] btn.textContent =", btn?.textContent);

      // Si déjà connecté, ouvrir la page de gestion
      if (btn.textContent.trim() === "Gérer") {
        console.log(
          "[LinkedIn Agent] Bouton en mode Gérer → ouverture du dashboard"
        );
        chrome.tabs.create({ url: SERVER_URL + "/#linkedin-account" });
        return;
      }

      // Capturer le cookie directement depuis popup.js (plus fiable que message passing)
      btn.textContent = "Capture...";
      btn.disabled = true;
      if (text) text.textContent = "Capture du cookie en cours...";
      console.log("[LinkedIn Agent] API_BASE_URL =", API_BASE_URL);

      try {
        // Vérifier que l'API cookies est disponible
        if (!chrome.cookies || !chrome.cookies.get) {
          btn.disabled = false;
          btn.textContent = "Connecter";
          if (text)
            text.textContent = "Rechargez l'extension (désactiver/réactiver)";
          console.error(
            "[LinkedIn Agent] chrome.cookies API non disponible. Rechargez l'extension."
          );
          return;
        }

        // 1. Lire le cookie li_at depuis Chrome
        const cookie = await chrome.cookies.get({
          url: "https://www.linkedin.com",
          name: "li_at"
        });

        if (!cookie || !cookie.value) {
          btn.disabled = false;
          btn.textContent = "Connecter";
          if (text) text.textContent = "Cookie li_at non trouvé";
          setTimeout(() => {
            if (
              confirm(
                "Vous devez d'abord vous connecter sur linkedin.com.\n\nOuvrir LinkedIn maintenant ?"
              )
            ) {
              chrome.tabs.create({ url: "https://www.linkedin.com/login" });
            }
          }, 300);
          return;
        }

        // 2. Envoyer le cookie au serveur
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

        const data = await response.json();

        btn.disabled = false;
        if (response.ok && data.success) {
          btn.textContent = "Connecté ✓";
          if (text) text.textContent = "Compte LinkedIn connecté !";
          setTimeout(() => refreshLinkedInAccount(), 1000);
        } else {
          btn.textContent = "Connecter";
          if (text) text.textContent = data.error || "Erreur serveur";
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Connecter";
        if (text)
          text.textContent = "Erreur: " + (err.message || "connexion échouée");
        console.error("[LinkedIn Agent] Capture error:", err);
      }
    });

  // Sauvegarde de l'URL serveur
  const saveBtn = document.getElementById("saveServerUrlBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const input = document.getElementById("serverUrlInput");
      const newUrl = (input?.value || "").trim().replace(/\/$/, "");
      if (!newUrl) return;
      SERVER_URL = newUrl;
      API_BASE_URL = newUrl + "/api";
      chrome.storage.local.set({ serverUrl: newUrl }, () => {
        chrome.runtime.sendMessage({ type: "SERVER_URL_UPDATED", url: newUrl });
        saveBtn.textContent = "Sauvegardé ✓";
        setTimeout(() => {
          saveBtn.textContent = "Sauvegarder";
        }, 2000);
        refreshData();
        refreshLinkedInAccount();
      });
    });
  }

  // Auto-refresh toutes les 5 secondes
  setInterval(refreshData, 5000);
  setInterval(refreshLinkedInAccount, 15000);
});

async function refreshLinkedInAccount() {
  try {
    const res = await fetch(`${API_BASE_URL}/linkedin-auth`);
    if (!res.ok) throw new Error("API unreachable");
    const data = await res.json();
    updateLinkedInAccountBar(data);
  } catch {
    updateLinkedInAccountBar({ connected: false });
  }
}

function updateLinkedInAccountBar(data) {
  const dot = document.getElementById("liAccountDot");
  const text = document.getElementById("liAccountText");
  const btn = document.getElementById("liAccountBtn");

  if (!dot || !text || !btn) return;

  if (data.connected) {
    dot.className = "account-dot li-connected";
    const label = data.name || data.email || "LinkedIn connecté";
    text.textContent = "🔵 " + label;
    btn.textContent = "Gérer";
    btn.className = "btn-linkedin";
  } else {
    dot.className = "account-dot li-disconnected";
    text.textContent = "Compte LinkedIn non connecté";
    btn.textContent = "Connecter";
    btn.className = "btn-linkedin";
  }
}

function openLinkedInAccountPage() {
  chrome.tabs.create({ url: SERVER_URL + "/#linkedin-account" });
}

async function refreshData() {
  try {
    // Statut du background
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      if (response) {
        updateStatus(response.isConnected, response.isProcessing);
      }
    });

    // Actions depuis l'API
    const [pendingRes, allRes] = await Promise.all([
      fetch(`${API_BASE_URL}/linkedin-actions?status=pending&limit=20`),
      fetch(`${API_BASE_URL}/linkedin-actions?status=completed&limit=20`)
    ]);

    if (pendingRes.ok && allRes.ok) {
      const pendingData = await pendingRes.json();
      const allData = await allRes.json();

      updateStats(pendingData, allData);
      updateActionsList(pendingData.actions || []);
      updateStatus(true, false);
    } else {
      updateStatus(false, false);
    }
  } catch (error) {
    console.error("Refresh error:", error);
    updateStatus(false, false);
  }
}

function updateStatus(connected, processing) {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  const procText = document.getElementById("processingText");

  if (processing) {
    dot.className = "status-dot processing";
    text.textContent = "En cours...";
    procText.textContent = "Exécution des actions";
  } else if (connected) {
    dot.className = "status-dot connected";
    text.textContent = "Connecté";
    procText.textContent = "";
  } else {
    dot.className = "status-dot disconnected";
    text.textContent = "Déconnecté";
    procText.textContent = "Vérifiez le serveur";
  }
}

function updateStats(pendingData, completedData) {
  const pending = pendingData.actions?.length || 0;
  const completed = completedData.actions?.length || 0;

  // Calculer les stats depuis daily_stats
  let failed = 0;
  let total = 0;

  if (pendingData.daily_stats) {
    pendingData.daily_stats.forEach((stat) => {
      total += parseInt(stat.count) || 0;
      failed += parseInt(stat.failed) || 0;
    });
  }

  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("failedCount").textContent = failed;
  document.getElementById("totalCount").textContent =
    total || pending + completed;
}

function updateActionsList(actions) {
  const list = document.getElementById("actionsList");

  if (!actions || actions.length === 0) {
    list.innerHTML = '<div class="empty-state">Aucune action en attente</div>';
    return;
  }

  list.innerHTML = actions
    .map((action) => {
      const payload =
        typeof action.payload === "string"
          ? JSON.parse(action.payload)
          : action.payload;
      const name =
        action.target_name ||
        payload?.keywords ||
        action.target_url?.split("/in/")[1] ||
        "Action";

      return `
      <div class="action-item">
        <span class="action-type ${action.action_type}">${formatActionType(action.action_type)}</span>
        <span class="action-name" title="${name}">${name}</span>
        <span class="action-status ${action.status}">${action.status}</span>
      </div>
    `;
    })
    .join("");
}

function formatActionType(type) {
  const labels = {
    search: "Recherche",
    visit_profile: "Visite",
    send_connection: "Connexion",
    send_message: "Message"
  };
  return labels[type] || type;
}
