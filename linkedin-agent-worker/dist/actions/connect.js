"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeSendConnection = executeSendConnection;
const browser_1 = require("../browser");
/**
 * Envoie une demande de connexion LinkedIn.
 * Gère le bouton "Se connecter", le modal personnalisé, et les limites de sécurité.
 */
async function executeSendConnection(page, action) {
    const targetUrl = action.target_url;
    if (!targetUrl) {
        return { success: false, error: 'URL du profil manquante' };
    }
    try {
        // 1. Naviguer vers le profil
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 20000 });
        await (0, browser_1.sleep)(2500);
        // 2. Scroll aléatoire pour simuler un humain
        await (0, browser_1.humanScroll)(page);
        await (0, browser_1.sleep)(500);
        // 3. Chercher le bouton "Se connecter" — sélecteurs LinkedIn 2024/2025
        const connectButtonSelectors = [
            'button[aria-label^="Invitez"]',
            'button[aria-label^="Inviter"]',
            'button[aria-label*="Se connecter"]',
            'button[aria-label*="Connect"]',
            'button[data-control-name="connect"]',
            'button.pv-s-profile-actions--connect',
            'button.artdeco-button--primary[data-live-test-connect-button]',
        ];
        let clicked = false;
        for (const selector of connectButtonSelectors) {
            clicked = await (0, browser_1.safeClick)(page, selector);
            if (clicked)
                break;
        }
        // Fallback: chercher via le texte du bouton dans le DOM
        if (!clicked) {
            clicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const btn = buttons.find(b => b.innerText.trim() === 'Se connecter' ||
                    b.innerText.trim() === 'Connect' ||
                    b.innerText.trim() === 'Inviter');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });
        }
        if (!clicked) {
            // Vérifier si déjà connecté
            const alreadyConnected = await page.evaluate(() => {
                const text = document.body.innerText;
                return (text.includes('1er échange') ||
                    text.includes('Connecté(e)') ||
                    text.includes('1st') ||
                    text.includes('Connected'));
            });
            if (alreadyConnected) {
                return { success: true, connection_sent: true, details: 'Déjà connecté' };
            }
            return { success: false, error: 'Bouton de connexion introuvable' };
        }
        await (0, browser_1.sleep)(1500);
        // 4. Modal : ajouter une note personnalisée (si fournie)
        const note = action.payload?.note || '';
        if (note) {
            const addNoteSelectors = [
                'button[aria-label="Ajouter une note"]',
                'button[aria-label="Add a note"]',
            ];
            for (const sel of addNoteSelectors) {
                const noteClicked = await (0, browser_1.safeClick)(page, sel);
                if (noteClicked) {
                    await (0, browser_1.sleep)(500);
                    const textarea = await page.$('textarea[name="message"]');
                    if (textarea) {
                        await textarea.type(note, { delay: 30 });
                    }
                    break;
                }
            }
        }
        // 5. Envoyer la demande — FIX: utiliser guillemets doubles pour l'apostrophe
        const sendSelectors = [
            "button[aria-label=\"Envoyer l'invitation\"]",
            "button[aria-label=\"Envoyer l'invitation sans note\"]",
            'button[aria-label="Send invitation"]',
            'button[aria-label="Send without a note"]',
            'button[data-control-name="invite.send_invite"]',
        ];
        let sendClicked = false;
        for (const sel of sendSelectors) {
            sendClicked = await (0, browser_1.safeClick)(page, sel);
            if (sendClicked)
                break;
        }
        if (!sendClicked) {
            // Fallback: chercher le bouton "Envoyer" dans le modal
            sendClicked = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const btn = buttons.find(b => b.innerText.trim().startsWith('Envoyer') ||
                    b.innerText.trim() === 'Send');
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            });
        }
        if (!sendClicked) {
            return { success: false, error: "Impossible de confirmer l'invitation" };
        }
        await (0, browser_1.sleep)(1500);
        // 6. Vérifier le succès / rate limit
        const successText = await page.evaluate(() => document.body.innerText);
        const rateLimited = successText.includes('Vous avez atteint la limite') ||
            successText.includes("limit for today") ||
            successText.includes('weekly invitation limit');
        if (rateLimited) {
            return { success: false, error: 'Rate limit LinkedIn atteinte' };
        }
        return { success: true, connection_sent: true };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Erreur connexion: ${message}` };
    }
}
//# sourceMappingURL=connect.js.map