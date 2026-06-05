// =============================================
// LinkedIn Selectors — Resilient DOM Selectors
// Multiple fallback strategies pour s'adapter aux changements LinkedIn
// =============================================

// Chaque sélecteur a plusieurs alternatives essayées en ordre.
// Si LinkedIn change son DOM, ajouter les nouveaux sélecteurs en tête de liste.
const SELECTORS = {
  // Profile page
  profileName: [
    "h1.text-heading-xlarge",
    "h1[class*='heading-xlarge']",
    ".pv-text-details__left-panel h1",
    "h1",
  ],
  profileHeadline: [
    ".text-body-medium.break-words",
    "[class*='headline']",
    ".pv-text-details__left-panel .text-body-medium",
  ],
  profileLocation: [
    ".text-body-small.inline.t-black--light.break-words",
    "[class*='location']",
  ],

  // Connect button
  connectButton: [
    "button[aria-label*='Invite']",
    "button[aria-label*='connect' i]",
    "button[aria-label*='se connecter' i]",
    ".pv-s-profile-actions--connect",
    "button.pvs-profile-actions__action",
  ],

  // Message button
  messageButton: [
    "button[aria-label*='Message' i]",
    "button[aria-label*='envoyer un message' i]",
    ".message-anywhere-button",
    "a[href*='/messaging/thread/']",
  ],

  // More options button (dropdown menu)
  moreButton: [
    "button[aria-label='More actions' i]",
    "button[aria-label*='Plus' i]",
    "button.artdeco-dropdown__trigger",
    ".pvs-profile-actions__overflow-toggle",
  ],

  // Send note / Add note button
  addNoteButton: [
    "button[aria-label*='Add a note' i]",
    "button[aria-label*='ajouter une note' i]",
    "button.artdeco-button--secondary",
  ],

  // Send / Confirm button
  sendButton: [
    "button[aria-label*='Send' i]",
    "button[aria-label*='Envoyer' i]",
    ".artdeco-button--primary",
  ],

  // Message textarea
  messageTextarea: [
    "div[contenteditable='true'][role='textbox']",
    ".msg-form__contenteditable",
    "textarea[name='message']",
    "#custom-message",
  ],

  // Search results
  searchResultItem: [
    ".reusable-search__result-container",
    ".search-results-container li",
    ".entity-result",
  ],
  searchResultName: [
    ".entity-result__title-text a",
    ".actor-name",
    "a[href*='/in/']",
  ],

  // Inbox / Messaging
  conversationItem: [
    ".msg-conversation-listitem",
    ".msg-conversations-container__convo-item",
  ],
  conversationLink: ["a[href*='/messaging/thread/']"],
  messageItem: [
    ".msg-s-event-listitem",
    ".msg-s-message-list__event",
  ],
  unreadBadge: [
    ".msg-conversation-card__unread-count",
    "[class*='unread']",
  ],

  // Connection degree
  degreeBadge: [
    ".dist-value",
    "[class*='distance-badge']",
    "span.dist-value",
  ],
};

// Trouve un élément en essayant tous les sélecteurs fallback
function findElement(key, root = document) {
  const selectors = SELECTORS[key];
  if (!selectors) {
    console.warn(`[SELECTORS] Unknown key: ${key}`);
    return null;
  }
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch {
      // Invalid selector, try next
    }
  }
  return null;
}

// Trouve tous les éléments avec fallback
function findElements(key, root = document) {
  const selectors = SELECTORS[key];
  if (!selectors) return [];
  for (const sel of selectors) {
    try {
      const els = root.querySelectorAll(sel);
      if (els.length > 0) return Array.from(els);
    } catch {
      // ignore
    }
  }
  return [];
}

// Trouve un bouton par son texte (fallback ultime)
function findButtonByText(texts) {
  const buttons = document.querySelectorAll("button, a[role='button']");
  const lowerTexts = (Array.isArray(texts) ? texts : [texts]).map((t) =>
    t.toLowerCase().trim()
  );
  for (const btn of buttons) {
    const txt = (btn.textContent || "").toLowerCase().trim();
    const aria = (btn.getAttribute("aria-label") || "").toLowerCase().trim();
    if (lowerTexts.some((t) => txt.includes(t) || aria.includes(t))) {
      return btn;
    }
  }
  return null;
}

// Attendre qu'un élément apparaisse (utile pour le contenu chargé en async)
async function waitForElement(key, maxAttempts = 20, delayMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    const el = findElement(key);
    if (el) return el;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

// Vérifier l'intégrité des sélecteurs (health check)
function checkSelectorsHealth() {
  const report = { healthy: [], broken: [], total: Object.keys(SELECTORS).length };
  for (const key of Object.keys(SELECTORS)) {
    if (findElement(key)) {
      report.healthy.push(key);
    } else {
      report.broken.push(key);
    }
  }
  report.healthRate =
    ((report.healthy.length / report.total) * 100).toFixed(0) + "%";
  return report;
}

// Export pour utilisation dans content.js / background.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SELECTORS,
    findElement,
    findElements,
    findButtonByText,
    waitForElement,
    checkSelectorsHealth,
  };
}
if (typeof window !== "undefined") {
  window.LinkedInSelectors = {
    SELECTORS,
    findElement,
    findElements,
    findButtonByText,
    waitForElement,
    checkSelectorsHealth,
  };
}
