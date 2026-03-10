// Content script - S'exécute sur les pages LinkedIn
// Gère le scraping de profils, résultats de recherche, et l'envoi de connexions/messages

(function() {
  'use strict';

  // Écouter les messages du background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'SCRAPE_PROFILE':
        scrapeProfile(message.actionId);
        sendResponse({ received: true });
        break;

      case 'SCRAPE_SEARCH_RESULTS':
        scrapeSearchResults(message.actionId, message.payload);
        sendResponse({ received: true });
        break;

      case 'SEND_CONNECTION':
        sendConnection(message.actionId, message.note);
        sendResponse({ received: true });
        break;

      case 'SEND_MESSAGE':
        sendMessage(message.actionId, message.message);
        sendResponse({ received: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
    return true;
  });

  // =============================================
  // SCRAPING: Profil LinkedIn
  // =============================================
  async function scrapeProfile(actionId) {
    try {
      await waitForSelector('.pv-top-card', 8000);

      const name = getTextContent('.pv-top-card--list .text-heading-xlarge') ||
                   getTextContent('h1.text-heading-xlarge') ||
                   getTextContent('.pv-text-details--left-aligned h1');

      const role = getTextContent('.pv-top-card--list .text-body-medium') ||
                   getTextContent('.pv-text-details--left-aligned .text-body-medium');

      const headline = getTextContent('.pv-top-card .text-body-medium');

      const locationEl = document.querySelector('.pv-top-card--list-bullet .text-body-small') ||
                         document.querySelector('.pv-text-details--left-aligned .text-body-small.t-black--light');
      const location = locationEl ? locationEl.textContent.trim() : '';

      // Trouver l'entreprise actuelle dans l'expérience
      const experienceSection = document.querySelector('#experience');
      let company = '';
      if (experienceSection) {
        const companyEl = experienceSection.closest('section')?.querySelector('.pv-entity__secondary-title') ||
                          experienceSection.parentElement?.querySelector('span.t-bold span[aria-hidden="true"]');
        company = companyEl ? companyEl.textContent.trim() : '';
      }

      // Fallback: extraire l'entreprise du headline
      if (!company && headline) {
        const parts = headline.split(' chez ');
        if (parts.length > 1) company = parts[1].trim();
        if (!company) {
          const atParts = headline.split(' at ');
          if (atParts.length > 1) company = atParts[1].trim();
        }
      }

      // Nombre de connexions
      const connectionsEl = document.querySelector('.pv-top-card--list-bullet .t-bold');
      const connections = connectionsEl ? connectionsEl.textContent.trim() : '';

      // Secteur/industrie
      const aboutSection = document.querySelector('#about');
      const industry = ''; // LinkedIn ne montre plus toujours l'industrie directement

      const profileData = {
        name: name || 'Inconnu',
        role: role || headline || '',
        company,
        location,
        connections,
        industry,
        linkedin_url: window.location.href.split('?')[0],
        scraped_at: new Date().toISOString(),
      };

      console.log('[LinkedIn Agent] Profile scraped:', profileData);

      chrome.runtime.sendMessage({
        type: 'PROFILE_DATA',
        actionId,
        data: profileData,
      });

    } catch (error) {
      console.error('[LinkedIn Agent] Scrape profile error:', error);
      chrome.runtime.sendMessage({
        type: 'ACTION_FAILED',
        actionId,
        error: error.message || 'Erreur lors du scraping du profil',
      });
    }
  }

  // =============================================
  // SCRAPING: Résultats de recherche
  // =============================================
  async function scrapeSearchResults(actionId, payload) {
    try {
      await waitForSelector('.reusable-search__result-container', 8000);

      const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const limit = parsedPayload?.limit || 10;

      const resultCards = document.querySelectorAll('.reusable-search__result-container');
      const profiles = [];

      for (let i = 0; i < Math.min(resultCards.length, limit); i++) {
        const card = resultCards[i];

        const nameEl = card.querySelector('.entity-result__title-text a span[aria-hidden="true"]') ||
                       card.querySelector('.entity-result__title-text .t-bold span[aria-hidden="true"]');
        const name = nameEl ? nameEl.textContent.trim() : '';

        const subtitleEl = card.querySelector('.entity-result__primary-subtitle');
        const subtitle = subtitleEl ? subtitleEl.textContent.trim() : '';

        const secondaryEl = card.querySelector('.entity-result__secondary-subtitle');
        const location = secondaryEl ? secondaryEl.textContent.trim() : '';

        const linkEl = card.querySelector('.entity-result__title-text a') ||
                       card.querySelector('a.app-aware-link');
        const linkedinUrl = linkEl ? linkEl.href.split('?')[0] : '';

        if (name && name !== 'Utilisateur LinkedIn') {
          profiles.push({
            name,
            role: subtitle,
            location,
            linkedin_url: linkedinUrl,
          });
        }
      }

      console.log(`[LinkedIn Agent] Search results: ${profiles.length} profiles found`);

      chrome.runtime.sendMessage({
        type: 'SEARCH_RESULTS',
        actionId,
        data: profiles,
      });

    } catch (error) {
      console.error('[LinkedIn Agent] Search scrape error:', error);
      chrome.runtime.sendMessage({
        type: 'ACTION_FAILED',
        actionId,
        error: error.message || 'Erreur lors du scraping des résultats',
      });
    }
  }

  // =============================================
  // ACTION: Envoyer une demande de connexion
  // =============================================
  async function sendConnection(actionId, note) {
    try {
      await waitForSelector('.pv-top-card', 5000);

      // Chercher le bouton "Se connecter" / "Connect"
      const connectBtn = findButton(['Se connecter', 'Connect', 'Connexion']);
      
      if (!connectBtn) {
        // Essayer via le menu "Plus" / "More"
        const moreBtn = findButton(['Plus', 'More', '...']);
        if (moreBtn) {
          moreBtn.click();
          await delay(1000);
          
          const connectOption = findButton(['Se connecter', 'Connect']);
          if (connectOption) {
            connectOption.click();
          } else {
            throw new Error('Bouton "Se connecter" non trouvé dans le menu');
          }
        } else {
          throw new Error('Bouton "Se connecter" non trouvé sur le profil. Peut-être déjà connecté.');
        }
      } else {
        connectBtn.click();
      }

      await delay(1500);

      // Si une note est fournie, cliquer sur "Ajouter une note"
      if (note) {
        const addNoteBtn = findButton(['Ajouter une note', 'Add a note']);
        if (addNoteBtn) {
          addNoteBtn.click();
          await delay(500);

          // Remplir le champ de note
          const noteField = document.querySelector('#custom-message') ||
                            document.querySelector('textarea[name="message"]') ||
                            document.querySelector('.send-invite__custom-message');
          
          if (noteField) {
            noteField.focus();
            noteField.value = note;
            noteField.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(300);
          }
        }
      }

      // Cliquer sur "Envoyer" / "Send"
      await delay(500);
      const sendBtn = findButton(['Envoyer', 'Send', 'Envoyer l\'invitation']);
      if (sendBtn) {
        sendBtn.click();
        await delay(1000);

        chrome.runtime.sendMessage({
          type: 'ACTION_COMPLETED',
          actionId,
          result: { sent: true, note_included: !!note },
        });
      } else {
        throw new Error('Bouton "Envoyer" non trouvé');
      }

    } catch (error) {
      console.error('[LinkedIn Agent] Send connection error:', error);
      chrome.runtime.sendMessage({
        type: 'ACTION_FAILED',
        actionId,
        error: error.message || 'Erreur lors de l\'envoi de la connexion',
      });
    }
  }

  // =============================================
  // ACTION: Envoyer un message direct
  // =============================================
  async function sendMessage(actionId, messageText) {
    try {
      await waitForSelector('.pv-top-card', 5000);

      // Chercher le bouton "Message"
      const messageBtn = findButton(['Message', 'Envoyer un message']);
      
      if (!messageBtn) {
        throw new Error('Bouton "Message" non trouvé. Vérifiez que vous êtes connecté avec ce prospect.');
      }

      messageBtn.click();
      await delay(2000);

      // Trouver le champ de saisie du message
      const messageInput = document.querySelector('.msg-form__contenteditable') ||
                           document.querySelector('[contenteditable="true"][role="textbox"]') ||
                           document.querySelector('.msg-form__msg-content-container .msg-form__contenteditable');

      if (!messageInput) {
        throw new Error('Champ de message non trouvé');
      }

      // Remplir le message
      messageInput.focus();
      messageInput.innerHTML = `<p>${messageText}</p>`;
      messageInput.dispatchEvent(new Event('input', { bubbles: true }));
      await delay(500);

      // Cliquer sur "Envoyer"
      const sendBtn = document.querySelector('.msg-form__send-button') ||
                      findButton(['Envoyer', 'Send']);

      if (sendBtn) {
        sendBtn.click();
        await delay(1000);

        chrome.runtime.sendMessage({
          type: 'ACTION_COMPLETED',
          actionId,
          result: { sent: true, message_length: messageText.length },
        });
      } else {
        throw new Error('Bouton d\'envoi de message non trouvé');
      }

    } catch (error) {
      console.error('[LinkedIn Agent] Send message error:', error);
      chrome.runtime.sendMessage({
        type: 'ACTION_FAILED',
        actionId,
        error: error.message || 'Erreur lors de l\'envoi du message',
      });
    }
  }

  // =============================================
  // UTILITAIRES
  // =============================================

  function getTextContent(selector) {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : '';
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
        else reject(new Error(`Timeout: ${selector} non trouvé après ${timeout}ms`));
      }, timeout);
    });
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Indicateur visuel que l'extension est active
  console.log('[LinkedIn Agent] Extension active sur cette page');
})();
