const API_BASE_URL = "http://localhost:3000/api";

document.addEventListener("DOMContentLoaded", () => {
  refreshData();
  refreshLinkedInAccount();

  document.getElementById("refreshBtn").addEventListener("click", () => {
    refreshData();
    refreshLinkedInAccount();
    // Aussi déclencher un poll manuel dans le background
    chrome.runtime.sendMessage({ type: "MANUAL_POLL" });
  });

  document.getElementById("openDashboardBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:3000" });
  });

  document.getElementById("liAccountBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:3000/#linkedin-account" });
  });

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
  // Ouvre directement sur l'onglet Compte LinkedIn via le hash URL
  chrome.tabs.create({ url: "http://localhost:3000/#linkedin-account" });
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
