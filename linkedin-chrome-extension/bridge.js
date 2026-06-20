// Bridge content script — runs on the dashboard (localhost:3000 or https://linqen.xyz)
// Forwards window.postMessage requests from the page to the extension's background script.

(function () {
  console.log(
    "[LinkedIn Agent BRIDGE] ✅ Bridge content script chargé sur",
    window.location.href
  );

  // Announce extension presence to the page (au chargement + à chaque demande)
  const announce = () =>
    window.postMessage({ type: "LINKEDIN_AGENT_EXTENSION_READY" }, "*");
  announce();
  // Re-announce après un court délai pour les apps SPA qui se montent après le content script
  setTimeout(announce, 500);
  setTimeout(announce, 2000);

  // Auto-configurer l'URL serveur par défaut si l'extension n'en a pas encore
  const origin = window.location.origin;
  if (origin && origin !== "null" && origin.startsWith("https://")) {
    chrome.runtime.sendMessage(
      { type: "SET_SERVER_URL", serverUrl: origin },
      () => {
        if (chrome.runtime.lastError) {
          // Extension peut ne pas être installée — silencieux
        }
      }
    );
  }

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;

    // Pass-through auth token from frontend to extension
    if (data.type === "SET_AUTH_TOKEN") {
      chrome.runtime.sendMessage(
        { type: "SET_AUTH_TOKEN", token: data.token },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log(
              "[Bridge] Erreur SET_AUTH_TOKEN:",
              chrome.runtime.lastError.message
            );
          }
        }
      );
      return;
    }

    // Pass-through server URL from frontend to extension
    if (data.type === "SET_SERVER_URL") {
      chrome.runtime.sendMessage(
        { type: "SET_SERVER_URL", serverUrl: data.serverUrl },
        (response) => {
          if (chrome.runtime.lastError) {
            console.log(
              "[Bridge] Erreur SET_SERVER_URL:",
              chrome.runtime.lastError.message
            );
          }
        }
      );
      return;
    }

    if (data.type !== "LINKEDIN_AGENT_REQUEST") return;

    const { action, requestId } = data;
    if (!action || !requestId) return;

    try {
      // Ping keep-alive pour réveiller le service worker MV3 (qui s'arrête après 30s)
      await chrome.runtime.sendMessage({ type: "KEEP_ALIVE" }).catch(() => {});

      chrome.runtime.sendMessage({ type: action }, (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage(
            {
              type: "LINKEDIN_AGENT_RESPONSE",
              requestId,
              success: false,
              error: chrome.runtime.lastError.message
            },
            "*"
          );
          return;
        }
        window.postMessage(
          {
            type: "LINKEDIN_AGENT_RESPONSE",
            requestId,
            ...(response || { success: false, error: "Pas de réponse" })
          },
          "*"
        );
      });
    } catch (err) {
      window.postMessage(
        {
          type: "LINKEDIN_AGENT_RESPONSE",
          requestId,
          success: false,
          error: err?.message || "Erreur bridge"
        },
        "*"
      );
    }
  });
})();
