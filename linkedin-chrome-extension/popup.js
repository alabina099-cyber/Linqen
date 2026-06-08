const DEFAULT_SERVER_URL = "http://localhost:3000";
let API_BASE_URL = DEFAULT_SERVER_URL + "/api";
let SERVER_URL = DEFAULT_SERVER_URL;

// Default notification preferences (matches Settings.tsx defaults)
const DEFAULT_NOTIF_PREFS = {
  emailDailySummary: true,
  emailNewReply: true,
  emailNewConversion: true,
  emailLimitWarning: true
};

// Default daily limits (matches Settings.tsx limits defaults)
const DEFAULT_LIMITS = {
  dailyMessages: 50,
  dailyConnections: 20,
  dailyProfileViews: 100
};

let currentPrefs = { ...DEFAULT_NOTIF_PREFS };
let currentLimits = { ...DEFAULT_LIMITS };

// ============ BOOT ============
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
    refreshAll();
  });

  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshAll();
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
  if (liAccountBtn) {
    liAccountBtn.addEventListener("click", handleLinkedInConnect);
  }

  const dcConnectBtn = document.getElementById("dcConnectBtn");
  if (dcConnectBtn) {
    dcConnectBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: SERVER_URL + "/login" });
      window.close();
    });
  }

  // Auto-refresh
  setInterval(refreshData, 5000);
  setInterval(refreshLinkedInAccount, 15000);
  setInterval(refreshUserPrefs, 30000);
  setInterval(refreshAlerts, 10000);
});

// ============ UNIFIED REFRESH ============
async function refreshAll() {
  await refreshUserPrefs();
  await Promise.all([refreshData(), refreshLinkedInAccount(), refreshAlerts()]);
}

// ============ LINKEDIN CONNECT ============
async function handleLinkedInConnect() {
  const btn = document.getElementById("liAccountBtn");
  const text = document.getElementById("liAccountText");

  if (btn.textContent.trim() === "Manage") {
    chrome.tabs.create({ url: SERVER_URL + "/#linkedin-account" });
    return;
  }

  btn.textContent = "…";
  btn.disabled = true;
  if (text) text.textContent = "Capture…";

  try {
    if (!chrome.cookies || !chrome.cookies.get) {
      btn.disabled = false;
      btn.textContent = "Connect";
      if (text) text.textContent = "Reload the extension";
      return;
    }

    const cookie = await chrome.cookies.get({
      url: "https://www.linkedin.com",
      name: "li_at"
    });

    if (!cookie || !cookie.value) {
      btn.disabled = false;
      btn.textContent = "Connect";
      if (text) text.textContent = "li_at cookie not found";
      setTimeout(() => {
        if (
          confirm("You must be logged in on linkedin.com.\n\nOpen LinkedIn?")
        ) {
          chrome.tabs.create({ url: "https://www.linkedin.com/login" });
        }
      }, 300);
      return;
    }

    // Try to get LinkedIn profile name from active tab
    let profileName = "";
    let profileEmail = "";
    try {
      const [tab] = await chrome.tabs.query({
        url: "https://www.linkedin.com/*",
        active: true,
        currentWindow: true
      });
      if (tab && tab.id) {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            // Get name from navigation profile link or page title
            const nameEl = document.querySelector(
              '.feed-identity-module__actor-meta a, .artdeco-entity-lockup__title, [data-control-name="identity_welcome_message"]'
            );
            const name = nameEl ? nameEl.textContent.trim() : "";
            // Fallback: extract from page title "(...) | LinkedIn" or nav
            const fallbackName = !name
              ? document
                  .querySelector(".t-16.t-black.t-bold")
                  ?.textContent?.trim() || ""
              : name;
            return { name: fallbackName || name };
          }
        });
        if (result && result.result && result.result.name) {
          profileName = result.result.name;
        }
      }
    } catch (e) {
      console.log("[LinkedIn Agent] Could not get profile name:", e.message);
    }

    const response = await fetch(`${API_BASE_URL}/linkedin-auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method: "extension",
        cookie: cookie.value,
        name: profileName,
        email: profileEmail
      })
    });
    const data = await response.json();
    btn.disabled = false;

    if (response.ok && data.success) {
      btn.textContent = "Connected ✓";
      if (text) text.textContent = "LinkedIn account connected!";
      setTimeout(() => refreshLinkedInAccount(), 1000);
    } else {
      btn.textContent = "Connect";
      if (text) text.textContent = data.error || "Server error";
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Connect";
    if (text) text.textContent = "Error: " + (err.message || "failed");
    console.error("[LinkedIn Agent] Capture error:", err);
  }
}

// ============ USER PREFS ============
async function refreshUserPrefs() {
  try {
    const res = await fetch(`${API_BASE_URL}/users/me`);
    if (!res.ok) return;
    const data = await res.json();
    if (data?.user?.settings?.notifications) {
      currentPrefs = {
        ...DEFAULT_NOTIF_PREFS,
        ...data.user.settings.notifications
      };
    }
    if (data?.user?.settings?.limits) {
      currentLimits = { ...DEFAULT_LIMITS, ...data.user.settings.limits };
    }
    applyPrefsVisibility();
  } catch (err) {
    console.warn("[LinkedIn Agent] Failed to load user prefs:", err);
  }
}

function applyPrefsVisibility() {
  // Daily summary section visibility
  const summarySection = document.getElementById("summarySection");
  if (summarySection) {
    summarySection.classList.toggle(
      "disabled",
      !currentPrefs.emailDailySummary
    );
  }
  // Alert cards will be shown/hidden individually based on prefs + data presence
}

// ============ LINKEDIN ACCOUNT ============
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
    document.body.classList.remove("disconnected");
    dot.className = "pill-dot blue";
    const label = data.name || data.email || "Connected";
    text.textContent = label;
    btn.textContent = "Manage";
    btn.className = "pill-action";
  } else {
    document.body.classList.add("disconnected");
    dot.className = "pill-dot err";
    text.textContent = "Not connected";
    btn.textContent = "Connect";
    btn.className = "pill-action";
  }
}

// ============ MAIN DATA REFRESH (stats + actions) ============
async function refreshData() {
  try {
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      if (response) {
        updateStatus(response.isConnected, response.isProcessing);
      }
    });

    const [pendingRes, completedRes] = await Promise.all([
      fetch(`${API_BASE_URL}/linkedin-actions?status=pending&limit=20`),
      fetch(`${API_BASE_URL}/linkedin-actions?status=completed&limit=20`)
    ]);

    if (pendingRes.ok && completedRes.ok) {
      const pendingData = await pendingRes.json();
      const completedData = await completedRes.json();
      updateStats(pendingData, completedData);
      updateActionsList(pendingData.actions || []);
      updateStatus(true, false);

      // Refresh limit warning based on today's completed count
      const todayCompleted =
        extractStatCount(pendingData.stats, "completed") || 0;
      updateLimitAlert(todayCompleted);
    } else {
      updateStatus(false, false);
    }
  } catch (error) {
    console.error("Refresh error:", error);
    updateStatus(false, false);
  }
}

function extractStatCount(stats, status) {
  if (!Array.isArray(stats)) return 0;
  const row = stats.find((s) => s.status === status);
  return row ? parseInt(row.count) || 0 : 0;
}

function updateStatus(connected, processing) {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  if (!dot || !text) return;

  if (processing) {
    dot.className = "pill-dot warn";
    text.textContent = "Actions in progress…";
  } else if (connected) {
    dot.className = "pill-dot ok";
    text.textContent = "Connected";
  } else {
    dot.className = "pill-dot err";
    text.textContent = "Disconnected";
  }
}

function updateStats(pendingData, completedData) {
  const stats = pendingData.stats || [];
  const todayPending =
    extractStatCount(stats, "pending") +
    extractStatCount(stats, "approved") +
    extractStatCount(stats, "pending_approval");
  const todayCompleted = extractStatCount(stats, "completed");
  const todayFailed = extractStatCount(stats, "failed");
  const todayTotal = stats.reduce(
    (sum, s) => sum + (parseInt(s.count) || 0),
    0
  );

  setText("pendingCount", todayPending);
  setText("completedCount", todayCompleted);
  setText("failedCount", todayFailed);
  setText("totalCount", todayTotal);

  const actionsBadge = document.getElementById("actionsBadge");
  if (actionsBadge) {
    const count = pendingData.actions?.length || 0;
    actionsBadge.textContent = count;
  }
}

function updateActionsList(actions) {
  const list = document.getElementById("actionsList");
  if (!list) return;

  if (!actions || actions.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🌙</div>
        <div>No pending actions</div>
      </div>`;
    return;
  }

  const icons = {
    visit_profile: "👁",
    send_connection: "🤝",
    send_message: "💬"
  };

  const allowed = ["visit_profile", "send_connection", "send_message"];

  list.innerHTML = actions
    .filter((action) => allowed.includes(action.action_type))
    .map((action) => {
      const payload =
        typeof action.payload === "string"
          ? safeParse(action.payload)
          : action.payload;
      const name =
        action.target_name ||
        payload?.keywords ||
        action.target_url?.split("/in/")[1] ||
        "Action";
      const type = action.action_type;
      const emoji = icons[type] || "⚡";
      return `
        <div class="action-item">
          <div class="action-avatar ${escapeAttr(type)}">${emoji}</div>
          <div class="action-body">
            <div class="action-name" title="${escapeAttr(name)}">${escapeHTML(name)}</div>
            <div class="action-meta">
              <span class="action-type-label">${formatActionType(type)}</span>
            </div>
          </div>
          <span class="action-status ${escapeAttr(action.status)}">${escapeHTML(action.status)}</span>
        </div>`;
    })
    .join("");
}

function formatActionType(type) {
  const labels = {
    visit_profile: "Visit",
    send_connection: "Connection",
    send_message: "Message"
  };
  return labels[type] || type;
}

// ============ ALERTS (driven by notification preferences) ============
async function refreshAlerts() {
  try {
    const [notifRes, statsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/notifications`),
      fetch(`${API_BASE_URL}/stats`)
    ]);

    let notifData = {};
    let statsData = {};
    if (notifRes.ok) notifData = await notifRes.json();
    if (statsRes.ok) statsData = await statsRes.json();

    renderAlerts(notifData, statsData);
  } catch (err) {
    console.warn("[LinkedIn Agent] Failed to load alerts:", err);
    renderAlerts({}, {});
  }
}

function renderAlerts(notifData, statsData) {
  const replies = parseInt(notifData?.newReplies || 0);
  const notifications = Array.isArray(notifData?.notifications)
    ? notifData.notifications
    : [];

  // Extract recent reply names from notifications list (type 'reply' or 'message')
  const recentReplyNames = notifications
    .filter((n) => /reply|response|message/i.test(n.type || ""))
    .slice(0, 3)
    .map((n) => n.title || n.data?.name || "")
    .filter(Boolean);

  let visibleCount = 0;

  // ============ REPLY ALERT ============
  const replyEl = document.getElementById("alertReply");
  if (currentPrefs.emailNewReply && replies > 0) {
    replyEl.classList.remove("hidden");
    setText("alertReplyCount", replies);
    const detail = recentReplyNames.length
      ? recentReplyNames.join(", ")
      : `${replies} new reply(ies) in the last 24h`;
    setText("alertReplyDetail", detail);
    visibleCount++;
  } else {
    replyEl.classList.add("hidden");
  }

  // Limit alert handled separately by updateLimitAlert()
  // But we count its current visibility here:
  const limitEl = document.getElementById("alertLimit");
  if (limitEl && !limitEl.classList.contains("hidden")) visibleCount++;

  // ============ EMPTY STATE ============
  const emptyEl = document.getElementById("alertEmpty");
  if (visibleCount === 0) {
    emptyEl.classList.remove("hidden");
    const anyPrefOn =
      currentPrefs.emailNewReply ||
      currentPrefs.emailNewConversion ||
      currentPrefs.emailLimitWarning;
    const detail = anyPrefOn
      ? "All quiet — no recent events"
      : "Enable them in settings";
    const emptyDetail = emptyEl.querySelector(".alert-detail");
    if (emptyDetail) emptyDetail.textContent = detail;
  } else {
    emptyEl.classList.add("hidden");
  }
}

function updateLimitAlert(todayActions) {
  const limitEl = document.getElementById("alertLimit");
  if (!limitEl) return;

  if (!currentPrefs.emailLimitWarning) {
    limitEl.classList.add("hidden");
    return;
  }

  // Use the most restrictive daily limit as reference (messages)
  const limit = currentLimits.dailyMessages || 50;
  const pct = Math.min(100, Math.round((todayActions / limit) * 100));

  // Only show the warning when close to the limit
  if (pct >= 80) {
    limitEl.classList.remove("hidden");
    setText(
      "alertLimitTitle",
      pct >= 100 ? "Limit reached" : "Approaching limit"
    );
    setText(
      "alertLimitText",
      `${todayActions}/${limit} actions sent (${pct}%)`
    );
    const bar = document.getElementById("alertLimitBar");
    if (bar) bar.style.width = pct + "%";
    // Re-render alerts to update empty state logic
    // (renderAlerts reads limitEl visibility to count)
  } else {
    limitEl.classList.add("hidden");
  }
}

// ============ HELPERS ============
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

function escapeHTML(str) {
  return String(str || "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[c]
  );
}

function escapeAttr(str) {
  return String(str || "").replace(/[^a-zA-Z0-9_-]/g, "");
}
