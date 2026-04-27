// Bridge content script — runs on the dashboard (localhost:3000)
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

  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "LINKEDIN_AGENT_REQUEST") return;

    const { action, requestId } = data;
    if (!action || !requestId) return;

    try {
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
