"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeVisitProfile = executeVisitProfile;
const browser_1 = require("../browser");
/**
 * Visite un profil LinkedIn et extrait les informations publiques.
 * Ne nécessite pas d'être connecté (profils publics).
 */
async function executeVisitProfile(page, action) {
    const targetUrl = action.target_url;
    if (!targetUrl) {
        return { success: false, error: 'URL du profil manquante' };
    }
    try {
        // 1. Naviguer vers le profil
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        await (0, browser_1.sleep)(2500);
        // 2. Scroll pour charger le contenu dynamique
        await (0, browser_1.humanScroll)(page);
        await (0, browser_1.sleep)(1000);
        await (0, browser_1.humanScroll)(page);
        // 3. Extraire les informations du profil — sélecteurs LinkedIn 2024/2025
        const profile = await page.evaluate(() => {
            const getText = (selectors) => {
                for (const s of selectors) {
                    try {
                        const el = document.querySelector(s);
                        if (el) {
                            const text = el.textContent?.trim();
                            if (text && text.length > 0)
                                return text;
                        }
                    }
                    catch {
                        continue;
                    }
                }
                return undefined;
            };
            return {
                name: getText([
                    'h1.text-heading-xlarge',
                    'h1[class*="heading-xlarge"]',
                    'h1[class*="t-24"]',
                    '.pv-text-details__left-panel h1',
                    '.ph5 h1',
                    'h1',
                ]),
                role: getText([
                    '.text-body-medium.break-words',
                    '.text-body-medium[title]',
                    'div[data-field="headline"]',
                    'div[data-testid="profile-position"]',
                    '.pv-text-details__left-panel .text-body-medium',
                    '.ph5 .text-body-medium',
                ]),
                company: getText([
                    'button[aria-label*="Expérience"] + div span:first-child',
                    '.pv-text-details__left-panel .inline-show-more-text',
                    '.pv-entity__company-details span',
                    '[data-field="experience_company_name"]',
                ]),
                location: getText([
                    '.pb2.t-black--light.text-body-small',
                    'span[class*="t-black--light"][class*="text-body-small"]',
                    '.pv-top-card--list-bullet li span',
                    '.pv-text-details__left-panel span.text-body-small',
                    '.ph5 span.text-body-small',
                ]),
            };
        });
        return {
            success: true,
            profile: {
                name: profile.name,
                role: profile.role,
                company: profile.company,
                location: profile.location,
            },
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: `Erreur visite: ${message}` };
    }
}
//# sourceMappingURL=visit.js.map