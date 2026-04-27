// Helper to communicate with the LinkedIn Agent Chrome Extension
// via the bridge content script (window.postMessage).

export interface BridgeResponse {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

let extensionDetected = false;

if (typeof window !== "undefined") {
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type === "LINKEDIN_AGENT_EXTENSION_READY") {
      extensionDetected = true;
    }
  });
}

export function isExtensionInstalled(): boolean {
  return extensionDetected;
}

export function sendExtensionRequest(
  action: string,
  timeoutMs = 8000
): Promise<BridgeResponse> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve({ success: false, error: "Pas de window" });
      return;
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let settled = false;

    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || data.type !== "LINKEDIN_AGENT_RESPONSE") return;
      if (data.requestId !== requestId) return;
      if (settled) return;
      settled = true;
      window.removeEventListener("message", handler);
      resolve({
        success: !!data.success,
        message: data.message,
        error: data.error,
        ...data,
      });
    };

    window.addEventListener("message", handler);
    window.postMessage({ type: "LINKEDIN_AGENT_REQUEST", action, requestId }, "*");

    setTimeout(() => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", handler);
      resolve({
        success: false,
        error:
          "L'extension Chrome n'a pas répondu. Assurez-vous qu'elle est installée et activée.",
      });
    }, timeoutMs);
  });
}
