import { Page } from 'puppeteer';
import { ActionResult, LinkedInAction } from '../types';
import { safeWaitForSelector, safeClick, sleep } from '../browser';

/**
 * Envoie un message LinkedIn à un contact existant.
 * Prérequis : être déjà connecté avec la personne.
 */
export async function executeSendMessage(
  page: Page,
  action: LinkedInAction
): Promise<ActionResult> {
  const targetUrl = action.target_url;
  const messageText = action.payload?.message || '';

  if (!targetUrl) {
    return { success: false, error: 'URL du profil manquante' };
  }
  if (!messageText) {
    return { success: false, error: 'Texte du message manquant' };
  }

  try {
    // 1. Naviguer vers le profil
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 20000 });
    await sleep(2500);

    // 2. Chercher le bouton "Message" — sélecteurs LinkedIn 2024/2025
    const messageButtonSelectors = [
      'button[aria-label^="Envoyer un message à"]',
      'button[aria-label^="Envoyer un message"]',
      'button[aria-label^="Message"]',
      'button[aria-label^="Send message"]',
      'button[data-control-name="message"]',
      'button.pv-s-profile-actions--message',
      'a.message-anywhere-button',
    ];

    let clicked = false;
    for (const selector of messageButtonSelectors) {
      clicked = await safeClick(page, selector);
      if (clicked) break;
    }

    // Fallback: chercher via le texte du bouton
    if (!clicked) {
      clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b =>
          b.innerText.trim() === 'Message' ||
          b.innerText.trim() === 'Envoyer un message'
        );
        if (btn) { btn.click(); return true; }
        return false;
      });
    }

    if (!clicked) {
      return { success: false, error: 'Bouton de message introuvable (profil non connecté ou LinkedIn UI changée)' };
    }

    await sleep(1800);

    // 3. Attendre l'ouverture du chat — sélecteurs LinkedIn 2024/2025
    const chatInputSelectors = [
      'div.msg-form__contenteditable[contenteditable="true"]',
      'div[aria-label="Rédigez un message"][contenteditable="true"]',
      'div[aria-label="Write a message"][contenteditable="true"]',
      'div[contenteditable="true"].msg-form__contenteditable',
      'div[contenteditable="true"]',
      'textarea[name="message"]',
    ];

    let inputFound = false;
    for (const selector of chatInputSelectors) {
      const found = await safeWaitForSelector(page, selector, 6000);
      if (found) {
        await page.click(selector);
        await sleep(300);
        await page.type(selector, messageText, { delay: 25 });
        inputFound = true;
        break;
      }
    }

    if (!inputFound) {
      return { success: false, error: 'Zone de saisie du message introuvable' };
    }

    await sleep(600);

    // 4. Envoyer le message — sélecteurs LinkedIn 2024/2025
    const sendSelectors = [
      'button.msg-form__send-button',
      'button[aria-label="Envoyer"]',
      'button[aria-label="Send"]',
      'button[type="submit"]',
    ];

    let sendClicked = false;
    for (const sel of sendSelectors) {
      sendClicked = await safeClick(page, sel);
      if (sendClicked) break;
    }

    if (!sendClicked) {
      // Fallback: Ctrl+Enter pour envoyer
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
    }

    await sleep(1200);

    return { success: true, message_sent: true };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Erreur message: ${message}` };
  }
}
