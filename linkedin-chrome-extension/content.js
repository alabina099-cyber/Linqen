// Content script - S'exécute sur les pages LinkedIn
// Gère le scraping de profils, résultats de recherche, et l'envoi de connexions/messages

(function () {
  "use strict";

  // Écouter les messages du background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case "SCRAPE_PROFILE":
        scrapeProfile(message.actionId);
        sendResponse({ received: true });
        break;

      case "SCRAPE_SEARCH_RESULTS":
        scrapeSearchResults(message.actionId, message.payload);
        sendResponse({ received: true });
        break;

      case "SEND_CONNECTION":
        sendConnection(message.actionId, message.note);
        sendResponse({ received: true });
        break;

      case "SEND_MESSAGE":
        sendMessage(message.actionId, message.message);
        sendResponse({ received: true });
        break;

      case "SCRAPE_INBOX":
        scrapeInboxReplies(message.contactedProspects || []);
        sendResponse({ received: true });
        break;

      default:
        sendResponse({ error: "Unknown message type" });
    }
    return true;
  });

  // =============================================
  // SCRAPING: Profil LinkedIn
  // =============================================
  async function scrapeProfile(actionId) {
    try {
      await waitForSelector(".pv-top-card", 8000);

      const name =
        getTextContent(".pv-top-card--list .text-heading-xlarge") ||
        getTextContent("h1.text-heading-xlarge") ||
        getTextContent(".pv-text-details--left-aligned h1");

      const role =
        getTextContent(".pv-top-card--list .text-body-medium") ||
        getTextContent(".pv-text-details--left-aligned .text-body-medium");

      const headline = getTextContent(".pv-top-card .text-body-medium");

      const locationEl =
        document.querySelector(".pv-top-card--list-bullet .text-body-small") ||
        document.querySelector(
          ".pv-text-details--left-aligned .text-body-small.t-black--light"
        );
      const location = locationEl ? locationEl.textContent.trim() : "";

      // Trouver l'entreprise actuelle dans l'expérience
      const experienceSection = document.querySelector("#experience");
      let company = "";
      if (experienceSection) {
        const companyEl =
          experienceSection
            .closest("section")
            ?.querySelector(".pv-entity__secondary-title") ||
          experienceSection.parentElement?.querySelector(
            'span.t-bold span[aria-hidden="true"]'
          );
        company = companyEl ? companyEl.textContent.trim() : "";
      }

      // Fallback: extraire l'entreprise du headline
      if (!company && headline) {
        const parts = headline.split(" chez ");
        if (parts.length > 1) company = parts[1].trim();
        if (!company) {
          const atParts = headline.split(" at ");
          if (atParts.length > 1) company = atParts[1].trim();
        }
      }

      // Nombre de connexions
      const connectionsEl = document.querySelector(
        ".pv-top-card--list-bullet .t-bold"
      );
      const connections = connectionsEl ? connectionsEl.textContent.trim() : "";

      // Secteur/industrie
      const aboutSection = document.querySelector("#about");
      const industry = ""; // LinkedIn ne montre plus toujours l'industrie directement

      const profileData = {
        name: name || "Inconnu",
        role: role || headline || "",
        company,
        location,
        connections,
        industry,
        linkedin_url: window.location.href.split("?")[0],
        scraped_at: new Date().toISOString()
      };

      console.log("[LinkedIn Agent] Profile scraped:", profileData);

      chrome.runtime.sendMessage({
        type: "PROFILE_DATA",
        actionId,
        data: profileData
      });
    } catch (error) {
      console.error("[LinkedIn Agent] Scrape profile error:", error);
      chrome.runtime.sendMessage({
        type: "ACTION_FAILED",
        actionId,
        error: error.message || "Erreur lors du scraping du profil"
      });
    }
  }

  // =============================================
  // SCRAPING: Résultats de recherche
  // =============================================
  // Nettoyer un nom extrait de LinkedIn pour ne garder que prénom + nom
  function cleanScrapedName(rawName) {
    if (!rawName) return "";
    // Supprimer tout après un séparateur courant (|, ·, •, -, —, –, «, », @, chez)
    let name = rawName.split(/[|·•—–«»@\n]/)[0].trim();
    // Supprimer les parenthèses et leur contenu
    name = name.replace(/\(.*?\)/g, "").trim();
    // Supprimer "chez ...", "at ...", "- ..." à la fin
    name = name.replace(/\s+(chez|at|de|du|des|pour)\s+.*/i, "").trim();
    // Supprimer les emojis
    name = name
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        ""
      )
      .trim();
    // Ne garder que les 3 premiers mots max (prénom + nom + particule éventuelle)
    const words = name.split(/\s+/).filter((w) => w.length > 0);
    if (words.length > 3) {
      name = words.slice(0, 3).join(" ");
    }
    return name;
  }

  async function scrapeSearchResults(actionId, payload) {
    try {
      // LinkedIn change souvent ses classes CSS — essayer plusieurs sélecteurs
      const CARD_SELECTORS = [
        ".reusable-search__result-container",
        "li.reusable-search__result-container",
        "ul.reusable-search__entity-result-list > li",
        "[data-chameleon-result-urn]",
        ".entity-result",
        ".search-result__wrapper",
        ".search-results-container li.list-style-none"
      ];

      let resultCards = null;
      let usedSelector = "";

      // D'abord vérifier instantanément si un sélecteur matche déjà
      for (const selector of CARD_SELECTORS) {
        const els = document.querySelectorAll(selector);
        if (els && els.length > 0) {
          resultCards = els;
          usedSelector = selector;
          console.log(
            `[LinkedIn Agent] Sélecteur trouvé immédiatement: "${selector}" → ${els.length} éléments`
          );
          break;
        }
      }

      // Si rien trouvé, attendre un peu et réessayer (timeout: 3s par sélecteur)
      if (!resultCards || resultCards.length === 0) {
        for (const selector of CARD_SELECTORS) {
          try {
            await waitForSelector(selector, 3000);
            resultCards = document.querySelectorAll(selector);
            if (resultCards && resultCards.length > 0) {
              usedSelector = selector;
              console.log(
                `[LinkedIn Agent] Sélecteur trouvé après attente: "${selector}" → ${resultCards.length} éléments`
              );
              break;
            }
          } catch (e) {
            // Continuer au suivant silencieusement
          }
        }
      }

      // Fallback ultime: chercher tous les liens profil dans la page
      if (!resultCards || resultCards.length === 0) {
        console.log(
          "[LinkedIn Agent] Aucun sélecteur standard trouvé, fallback par liens profil..."
        );
        await delay(3000);
        const allLinks = document.querySelectorAll('a[href*="/in/"]');
        const profiles = [];
        const seenUrls = new Set();

        for (const link of allLinks) {
          const href = link.href.split("?")[0];
          if (seenUrls.has(href) || !href.includes("/in/")) continue;

          // EXCLURE les liens dans les sections "relations en commun" / "insights"
          // Ces sections contiennent des profils qui ne sont PAS des résultats de recherche
          const insightParent =
            link.closest('[class*="insight"]') ||
            link.closest('[class*="social-proof"]') ||
            link.closest('[class*="mutual"]') ||
            link.closest('[class*="shared-connection"]');
          if (insightParent) {
            console.log(
              `[LinkedIn Agent] Fallback: lien exclu (relation en commun): ${href}`
            );
            continue;
          }

          // Vérifier aussi si le texte parent contient "relation que vous avez en commun"
          const parentText =
            (link.closest("div") || link.parentElement)?.textContent || "";
          if (
            parentText.includes("relation que vous avez en commun") ||
            parentText.includes("mutual connection") ||
            parentText.includes("shared connection")
          ) {
            console.log(
              `[LinkedIn Agent] Fallback: lien exclu (texte relation en commun): ${href}`
            );
            continue;
          }

          seenUrls.add(href);

          // Remonter pour trouver le conteneur parent
          const container =
            link.closest("li") ||
            link.closest("[class*='result']") ||
            link.parentElement?.parentElement;
          if (!container) continue;

          const nameEl = link.querySelector('span[aria-hidden="true"]') || link;
          const name = nameEl ? nameEl.textContent.trim() : "";
          if (!name || name === "Utilisateur LinkedIn" || name.length < 2)
            continue;

          // Chercher le rôle/titre dans les éléments proches
          const roleEl =
            container.querySelector(".entity-result__primary-subtitle") ||
            container.querySelector("[class*='subtitle']") ||
            container.querySelector(".t-14.t-normal");
          const role = roleEl ? roleEl.textContent.trim() : "";

          const locEl =
            container.querySelector(".entity-result__secondary-subtitle") ||
            container.querySelector("[class*='secondary']");
          const location = locEl ? locEl.textContent.trim() : "";

          profiles.push({
            name: cleanScrapedName(name),
            role,
            location,
            linkedin_url: href
          });
        }

        console.log(
          `[LinkedIn Agent] Fallback: ${profiles.length} profils trouvés par liens`
        );
        chrome.runtime.sendMessage({
          type: "SEARCH_RESULTS",
          actionId,
          data: profiles
        });
        return;
      }

      // Parsing normal avec le sélecteur qui a fonctionné
      const parsedPayload =
        typeof payload === "string" ? JSON.parse(payload) : payload;
      const limit = parsedPayload?.limit || 10;
      const profiles = [];

      for (let i = 0; i < Math.min(resultCards.length, limit); i++) {
        const card = resultCards[i];

        // Nom: essayer plusieurs sélecteurs
        const nameEl =
          card.querySelector(
            '.entity-result__title-text a span[aria-hidden="true"]'
          ) ||
          card.querySelector(
            '.entity-result__title-text .t-bold span[aria-hidden="true"]'
          ) ||
          card.querySelector('a[href*="/in/"] span[aria-hidden="true"]') ||
          card.querySelector('span.t-bold > span[aria-hidden="true"]');
        const name = nameEl ? nameEl.textContent.trim() : "";

        // Rôle/titre
        const subtitleEl =
          card.querySelector(".entity-result__primary-subtitle") ||
          card.querySelector("[class*='primary-subtitle']") ||
          card.querySelector(".t-14.t-normal:not(.t-black--light)");
        const subtitle = subtitleEl ? subtitleEl.textContent.trim() : "";

        // Localisation
        const secondaryEl =
          card.querySelector(".entity-result__secondary-subtitle") ||
          card.querySelector("[class*='secondary-subtitle']") ||
          card.querySelector(".t-14.t-normal.t-black--light");
        const location = secondaryEl ? secondaryEl.textContent.trim() : "";

        // URL LinkedIn — UNIQUEMENT depuis le titre du résultat
        // NE PAS utiliser de fallback générique 'a[href*="/in/"]' car cela
        // capturerait les liens des relations en commun (ex: "Baha Saada est une relation...")
        const linkEl =
          card.querySelector(".entity-result__title-text a") ||
          card.querySelector(".entity-result__title-text .t-bold a") ||
          card.querySelector('.entity-result__title-line a[href*="/in/"]');
        const linkedinUrl = linkEl ? linkEl.href.split("?")[0] : "";

        // Si pas de lien titre trouvé, ce n'est pas un vrai résultat → skip
        if (!linkedinUrl) continue;

        const cleanName = cleanScrapedName(name);
        if (
          cleanName &&
          cleanName !== "Utilisateur LinkedIn" &&
          cleanName.length >= 2
        ) {
          profiles.push({
            name: cleanName,
            role: subtitle,
            location,
            linkedin_url: linkedinUrl
          });
        }
      }

      console.log(
        `[LinkedIn Agent] Search results: ${profiles.length} profiles found (sélecteur: ${usedSelector})`
      );

      chrome.runtime.sendMessage({
        type: "SEARCH_RESULTS",
        actionId,
        data: profiles
      });
    } catch (error) {
      console.error("[LinkedIn Agent] Search scrape error:", error);
      chrome.runtime.sendMessage({
        type: "ACTION_FAILED",
        actionId,
        error: error.message || "Erreur lors du scraping des résultats"
      });
    }
  }

  // =============================================
  // ACTION: Envoyer une demande de connexion
  // =============================================
  async function sendConnection(actionId, note) {
    try {
      await waitForSelector(".pv-top-card", 5000);

      // Chercher le bouton "Se connecter" / "Connect"
      const connectBtn = findButton(["Se connecter", "Connect", "Connexion"]);

      if (!connectBtn) {
        // Essayer via le menu "Plus" / "More"
        const moreBtn = findButton(["Plus", "More", "..."]);
        if (moreBtn) {
          moreBtn.click();
          await delay(1000);

          const connectOption = findButton(["Se connecter", "Connect"]);
          if (connectOption) {
            connectOption.click();
          } else {
            throw new Error('Bouton "Se connecter" non trouvé dans le menu');
          }
        } else {
          throw new Error(
            'Bouton "Se connecter" non trouvé sur le profil. Peut-être déjà connecté.'
          );
        }
      } else {
        connectBtn.click();
      }

      await delay(1500);

      // Si une note est fournie, cliquer sur "Ajouter une note"
      if (note) {
        const addNoteBtn = findButton(["Ajouter une note", "Add a note"]);
        if (addNoteBtn) {
          addNoteBtn.click();
          await delay(500);

          // Remplir le champ de note
          const noteField =
            document.querySelector("#custom-message") ||
            document.querySelector('textarea[name="message"]') ||
            document.querySelector(".send-invite__custom-message");

          if (noteField) {
            noteField.focus();
            noteField.value = note;
            noteField.dispatchEvent(new Event("input", { bubbles: true }));
            await delay(300);
          }
        }
      }

      // Cliquer sur "Envoyer" / "Send"
      await delay(500);
      const sendBtn = findButton(["Envoyer", "Send", "Envoyer l'invitation"]);
      if (sendBtn) {
        sendBtn.click();
        await delay(1000);

        chrome.runtime.sendMessage({
          type: "ACTION_COMPLETED",
          actionId,
          result: { sent: true, note_included: !!note }
        });
      } else {
        throw new Error('Bouton "Envoyer" non trouvé');
      }
    } catch (error) {
      console.error("[LinkedIn Agent] Send connection error:", error);
      chrome.runtime.sendMessage({
        type: "ACTION_FAILED",
        actionId,
        error: error.message || "Erreur lors de l'envoi de la connexion"
      });
    }
  }

  // =============================================
  // ACTION: Envoyer un message direct
  // =============================================
  async function sendMessage(actionId, messageText) {
    try {
      // Attendre que la page LinkedIn soit chargée
      await waitForSelector("main", 10000);
      await delay(1500);

      // Chercher le bouton "Message" sur la page profil
      // LinkedIn utilise plusieurs sélecteurs selon la version
      let messageBtn = null;

      // Méthode 1: sélecteur direct aria-label
      const allBtns = document.querySelectorAll('button, a[role="button"]');
      for (const btn of allBtns) {
        const txt = (btn.textContent || btn.getAttribute("aria-label") || "")
          .trim()
          .toLowerCase();
        if (
          txt === "message" ||
          txt === "envoyer un message" ||
          txt === "send message"
        ) {
          messageBtn = btn;
          break;
        }
      }

      // Méthode 2: sélecteur partiel si méthode 1 échoue
      if (!messageBtn) {
        for (const btn of allBtns) {
          const txt = (btn.textContent || btn.getAttribute("aria-label") || "")
            .trim()
            .toLowerCase();
          if (
            txt.includes("message") &&
            !txt.includes("demande") &&
            !txt.includes("request")
          ) {
            messageBtn = btn;
            break;
          }
        }
      }

      if (!messageBtn) {
        throw new Error(
          'Bouton "Message" non trouvé sur le profil. Assurez-vous d\'être connecté en 1ère relation avec ce prospect ou que LinkedIn est ouvert.'
        );
      }

      messageBtn.click();
      await delay(2500);

      // Trouver le champ de saisie du message (plusieurs sélecteurs possibles)
      let messageInput = null;
      const inputSelectors = [
        ".msg-form__contenteditable",
        '[contenteditable="true"][role="textbox"]',
        ".msg-form__msg-content-container [contenteditable]",
        ".msg-overlay-conversation-bubble [contenteditable]",
        "div.msg-form__contenteditable[contenteditable]"
      ];

      for (const sel of inputSelectors) {
        messageInput = document.querySelector(sel);
        if (messageInput) break;
      }

      // Attendre jusqu'à 5s si le champ n'est pas encore apparu
      if (!messageInput) {
        for (let i = 0; i < 10; i++) {
          await delay(500);
          for (const sel of inputSelectors) {
            messageInput = document.querySelector(sel);
            if (messageInput) break;
          }
          if (messageInput) break;
        }
      }

      if (!messageInput) {
        throw new Error(
          "Champ de saisie du message non trouvé après l'ouverture de la fenêtre de messagerie"
        );
      }

      // Remplir le message
      messageInput.focus();
      // Vider d'abord le champ
      messageInput.innerHTML = "";
      await delay(200);
      // Insérer le texte ligne par ligne pour gérer les retours à la ligne
      const lines = messageText.split("\n");
      for (let li = 0; li < lines.length; li++) {
        if (li > 0) {
          messageInput.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              which: 13,
              shiftKey: true,
              bubbles: true
            })
          );
          document.execCommand("insertLineBreak");
        }
        if (lines[li].length > 0) {
          document.execCommand("insertText", false, lines[li]);
        }
      }
      messageInput.dispatchEvent(new Event("input", { bubbles: true }));
      messageInput.dispatchEvent(new Event("change", { bubbles: true }));
      await delay(800);

      // Cliquer sur "Envoyer"
      let sendBtn =
        document.querySelector(".msg-form__send-button") ||
        document.querySelector('[data-control-name="send"]') ||
        document.querySelector('button[type="submit"].msg-form__send-button');

      if (!sendBtn) {
        // Fallback: chercher par texte
        const btns = document.querySelectorAll("button");
        for (const btn of btns) {
          const txt = (btn.textContent || "").trim().toLowerCase();
          if (txt === "envoyer" || txt === "send") {
            sendBtn = btn;
            break;
          }
        }
      }

      if (!sendBtn) {
        throw new Error(
          "Bouton d'envoi de message non trouvé après avoir rempli le message"
        );
      }

      // Vérifier que le bouton est activé (pas disabled)
      if (sendBtn.disabled) {
        await delay(500);
      }

      sendBtn.click();
      await delay(1500);

      chrome.runtime.sendMessage({
        type: "ACTION_COMPLETED",
        actionId,
        result: { sent: true, message_length: messageText.length }
      });
    } catch (error) {
      console.error("[LinkedIn Agent] Send message error:", error);
      chrome.runtime.sendMessage({
        type: "ACTION_FAILED",
        actionId,
        error: error.message || "Erreur lors de l'envoi du message"
      });
    }
  }

  // =============================================
  // SCRAPING: Inbox LinkedIn — Détecter les réponses par nom de prospect
  // Méthode fiable: ouvrir chaque conversation matchée et vérifier le vrai dernier message
  // =============================================
  async function scrapeInboxReplies(contactedProspects) {
    try {
      // Construire un map de noms normalisés → prospect info
      const prospectMap = {}; // nom normalisé → prospect
      for (const p of contactedProspects) {
        if (p.name) {
          const normalized = p.name.toLowerCase().trim();
          prospectMap[normalized] = p;
        }
      }

      console.log(
        `[LinkedIn Agent] Inbox: recherche de réponses pour ${contactedProspects.length} prospects:`,
        contactedProspects.map((p) => p.name).join(", ")
      );

      // Attendre le chargement de la liste de conversations
      await waitForSelector(
        ".msg-conversations-container__conversations-list, .msg-conversation-listitem",
        10000
      );
      await delay(2000);

      const conversations = document.querySelectorAll(
        ".msg-conversation-listitem, .msg-conversations-container__conversations-list li, .msg-conversation-card"
      );

      console.log(
        `[LinkedIn Agent] Inbox: ${conversations.length} conversations trouvées`
      );

      const replies = [];

      for (const conv of conversations) {
        try {
          // Nom du contact dans la conversation
          const nameEl = conv.querySelector(
            ".msg-conversation-listitem__participant-names .truncate, " +
              ".msg-conversation-card__participant-names, " +
              "h3.msg-conversation-listitem__title span, " +
              ".msg-conversation-listitem__title-text"
          );
          const rawName = nameEl ? nameEl.textContent.trim() : "";
          if (!rawName) continue;

          const convName = rawName.split(",")[0].trim().toLowerCase();

          // ÉTAPE 1: Match par NOM COMPLET uniquement (pas de prénom seul = trop de faux positifs)
          let matchedProspect = null;
          if (prospectMap[convName]) {
            matchedProspect = prospectMap[convName];
          } else {
            // Match partiel strict: le nom complet du prospect doit être dans le nom de la conversation
            for (const [pName, prospect] of Object.entries(prospectMap)) {
              // Exiger que le nom complet (prénom + nom) soit contenu, pas juste un prénom
              if (
                pName.split(" ").length >= 2 &&
                (convName.includes(pName) || pName.includes(convName))
              ) {
                matchedProspect = prospect;
                break;
              }
            }
          }

          if (!matchedProspect) continue;

          console.log(
            `[LinkedIn Agent] Inbox: 🔍 Conversation trouvée avec "${rawName}" → prospect #${matchedProspect.id} (${matchedProspect.name})`
          );

          // ÉTAPE 2: CLIQUER sur la conversation pour l'ouvrir et vérifier le vrai dernier message
          const clickTarget = conv.querySelector("a") || conv;
          clickTarget.click();
          await delay(2500); // Attendre le chargement de la conversation

          // ÉTAPE 3: Compter les bulles de messages et vérifier l'expéditeur du dernier
          const msgBubbles = document.querySelectorAll(
            ".msg-s-event-listitem, " +
              ".msg-s-message-list__event, " +
              ".msg-s-event-listitem__message-bubble"
          );

          if (msgBubbles.length < 2) {
            console.log(
              `[LinkedIn Agent] Inbox: "${rawName}" → seulement ${msgBubbles.length} message(s) → pas de réponse`
            );
            continue;
          }

          // Dernier message
          const lastMsg = msgBubbles[msgBubbles.length - 1];

          // Vérifier si le dernier message est de NOUS
          // LinkedIn marque nos messages avec des classes spécifiques
          const isOurMessage =
            lastMsg.classList.contains("msg-s-event-listitem--other") ===
              false &&
            (lastMsg.classList.contains("msg-s-event-listitem--self") ||
              lastMsg.querySelector(
                ".msg-s-event-listitem__message-bubble--self"
              ) !== null ||
              lastMsg.closest(".msg-s-event-listitem--self") !== null);

          // Fallback: vérifier le nom de l'expéditeur dans le message
          const senderEl = lastMsg.querySelector(
            ".msg-s-message-group__name, " +
              ".msg-s-event-listitem__name, " +
              ".msg-s-message-group__profile-link"
          );
          const senderName = senderEl
            ? senderEl.textContent.trim().toLowerCase()
            : "";

          // Vérifier aussi par la structure du message (LinkedIn met les messages envoyés à droite)
          const msgContainer =
            lastMsg.closest(".msg-s-message-list-content") ||
            document.querySelector(".msg-s-message-list-content");
          const allGroups = msgContainer
            ? msgContainer.querySelectorAll(".msg-s-message-group")
            : [];
          let lastGroupIsFromThem = false;

          if (allGroups.length > 0) {
            const lastGroup = allGroups[allGroups.length - 1];
            // Si le dernier groupe contient un lien profil avec le nom du prospect → c'est de lui
            const profileLink = lastGroup.querySelector(
              "a.msg-s-message-group__profile-link, .msg-s-message-group__name"
            );
            if (profileLink) {
              const groupSender = profileLink.textContent.trim().toLowerCase();
              lastGroupIsFromThem =
                convName.includes(groupSender) ||
                groupSender.includes(convName.split(" ")[0]);
              console.log(
                `[LinkedIn Agent] Inbox: dernier groupe de messages envoyé par: "${groupSender}" — est du prospect: ${lastGroupIsFromThem}`
              );
            }
          }

          // DÉCISION: le prospect a répondu SEULEMENT si on est SÛR que le dernier message est de lui
          const hasReplied =
            lastGroupIsFromThem ||
            (senderName &&
              convName.includes(senderName.split(" ")[0]) &&
              !isOurMessage);

          if (!hasReplied) {
            console.log(
              `[LinkedIn Agent] Inbox: "${rawName}" → dernier message est de nous ou indéterminé → pas de réponse`
            );
            continue;
          }

          // Récupérer le texte du dernier message
          const lastMsgText = lastMsg.querySelector(
            ".msg-s-event-listitem__body, .msg-s-event__content"
          );
          const replyText = lastMsgText
            ? lastMsgText.textContent.trim().substring(0, 100)
            : "";

          console.log(
            `[LinkedIn Agent] Inbox: ✅ "${rawName}" a VRAIMENT répondu ! Message: "${replyText.substring(0, 50)}..."`
          );

          replies.push({
            name: rawName.split(",")[0].trim(),
            prospect_id: matchedProspect.id,
            snippet: replyText,
            confirmed: true
          });
        } catch (e) {
          console.log(
            `[LinkedIn Agent] Inbox: erreur conversation: ${e.message}`
          );
        }
      }

      console.log(
        `[LinkedIn Agent] Inbox: ${replies.length} réponses CONFIRMÉES sur ${contactedProspects.length} prospects`
      );

      chrome.runtime.sendMessage({
        type: "INBOX_REPLIES",
        data: replies
      });
    } catch (error) {
      console.error("[LinkedIn Agent] Scrape inbox error:", error);
      chrome.runtime.sendMessage({
        type: "INBOX_REPLIES",
        data: [],
        error: error.message
      });
    }
  }

  // =============================================
  // UTILITAIRES
  // =============================================

  function getTextContent(selector) {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : "";
  }

  function findButton(labels) {
    const buttons = document.querySelectorAll('button, a[role="button"]');
    for (const btn of buttons) {
      const text = btn.textContent.trim().toLowerCase();
      for (const label of labels) {
        if (text.includes(label.toLowerCase())) {
          return btn;
        }
      }
    }
    return null;
  }

  function waitForSelector(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        const el = document.querySelector(selector);
        if (el) resolve(el);
        else
          reject(
            new Error(`Timeout: ${selector} non trouvé après ${timeout}ms`)
          );
      }, timeout);
    });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Indicateur visuel que l'extension est active
  console.log("[LinkedIn Agent] Extension active sur cette page");
})();
