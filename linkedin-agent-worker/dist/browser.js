"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrowser = getBrowser;
exports.createPage = createPage;
exports.closeBrowser = closeBrowser;
exports.safeWaitForSelector = safeWaitForSelector;
exports.safeClick = safeClick;
exports.humanType = humanType;
exports.humanScroll = humanScroll;
exports.sleep = sleep;
exports.isLoggedInToLinkedIn = isLoggedInToLinkedIn;
exports.loginToLinkedIn = loginToLinkedIn;
const puppeteer_1 = __importDefault(require("puppeteer"));
let sharedBrowser = null;
let browserUseCount = 0;
const MAX_USES_BEFORE_RESTART = 20;
/**
 * Retourne une instance partagée de Browser.
 * Réutilise le même processus Chromium pour économiser la RAM,
 * mais le redémarre tous les N cycles pour éviter les fuites mémoire.
 */
async function getBrowser(config) {
    if (sharedBrowser && browserUseCount < MAX_USES_BEFORE_RESTART) {
        browserUseCount++;
        return sharedBrowser;
    }
    if (sharedBrowser) {
        try {
            await sharedBrowser.close();
        }
        catch {
            // Ignorer les erreurs de fermeture
        }
        sharedBrowser = null;
    }
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
    sharedBrowser = await puppeteer_1.default.launch({
        headless: config.headless,
        executablePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-extensions',
            '--disable-background-networking',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-breakpad',
            '--disable-component-update',
            '--disable-default-apps',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--enable-features=NetworkService,NetworkServiceInProcess',
            '--force-color-profile=srgb',
            '--metrics-recording-only',
            ...config.puppeteerArgs,
        ],
        ignoreDefaultArgs: ['--enable-automation'],
    });
    browserUseCount = 1;
    return sharedBrowser;
}
/**
 * Crée une nouvelle Page avec des options de sécurité et d'anti-détection.
 */
async function createPage(browser) {
    const page = await browser.newPage();
    // User-Agent "humain"
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    // Viewport desktop standard
    await page.setViewport({ width: 1920, height: 1080 });
    // Intercepter et bloquer les ressources non essentielles (images, CSS, fonts)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            req.abort();
        }
        else {
            req.continue();
        }
    });
    return page;
}
/**
 * Ferme proprement le browser partagé.
 */
async function closeBrowser() {
    if (sharedBrowser) {
        try {
            await sharedBrowser.close();
        }
        catch {
            // Ignorer
        }
        sharedBrowser = null;
        browserUseCount = 0;
    }
}
/**
 * Attend qu'un élément soit présent avec un timeout.
 */
async function safeWaitForSelector(page, selector, timeout = 5000) {
    try {
        await page.waitForSelector(selector, { timeout });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Clique de manière sécurisée (vérifie la présence avant).
 */
async function safeClick(page, selector) {
    const found = await safeWaitForSelector(page, selector, 3000);
    if (!found)
        return false;
    await page.click(selector);
    return true;
}
/**
 * Tape du texte de manière humaine (délai entre les caractères).
 */
async function humanType(page, selector, text) {
    await page.focus(selector);
    for (const char of text) {
        await page.keyboard.type(char, { delay: Math.random() * 50 + 30 });
    }
}
/**
 * Scroll aléatoire pour simuler un comportement humain.
 */
async function humanScroll(page) {
    await page.evaluate(() => {
        const scrollAmount = Math.floor(Math.random() * 300 + 100);
        window.scrollBy(0, scrollAmount);
    });
    await sleep(Math.random() * 500 + 200);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Vérifie si le worker est actuellement connecté à LinkedIn.
 */
async function isLoggedInToLinkedIn(page) {
    try {
        await page.goto('https://www.linkedin.com/', { waitUntil: 'networkidle2', timeout: 20000 });
        await sleep(2000);
        const url = page.url();
        const loggedIn = url.includes('/feed') ||
            url.includes('/mynetwork') ||
            url.includes('/jobs') ||
            url.includes('/messaging') ||
            (!url.includes('/login') && !url.includes('/authwall') && !url.includes('/signup'));
        console.log(`[Login] URL actuelle: ${url} — connecté: ${loggedIn}`);
        return loggedIn;
    }
    catch (err) {
        console.error('[Login] Erreur lors de la vérification de connexion:', err);
        return false;
    }
}
/**
 * Connecte le worker à LinkedIn avec email + mot de passe.
 * Retourne true si la connexion a réussi, false sinon.
 */
async function loginToLinkedIn(page, email, password) {
    try {
        console.log('[Login] Navigation vers la page de connexion LinkedIn...');
        await page.goto('https://www.linkedin.com/login', { waitUntil: 'networkidle2', timeout: 20000 });
        await sleep(2000);
        // Remplir l'email
        const emailInput = await page.$('#username');
        if (!emailInput) {
            console.error('[Login] Champ email introuvable (#username)');
            return false;
        }
        await emailInput.click({ clickCount: 3 });
        await page.keyboard.type(email, { delay: 40 });
        await sleep(600);
        // Remplir le mot de passe
        const passwordInput = await page.$('#password');
        if (!passwordInput) {
            console.error('[Login] Champ mot de passe introuvable (#password)');
            return false;
        }
        await passwordInput.click({ clickCount: 3 });
        await page.keyboard.type(password, { delay: 40 });
        await sleep(600);
        // Cliquer sur "Se connecter"
        const submitSelectors = [
            'button[data-litms-control-urn="login-submit"]',
            '.login__form_action_container button[type="submit"]',
            'button[aria-label="Se connecter"]',
            'button[type="submit"]',
        ];
        let submitted = false;
        for (const sel of submitSelectors) {
            try {
                await page.click(sel);
                submitted = true;
                break;
            }
            catch {
                continue;
            }
        }
        if (!submitted) {
            await page.keyboard.press('Enter');
        }
        // Attendre la navigation
        try {
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
        }
        catch {
            // Timeout toléré — vérifier l'URL manuellement
        }
        await sleep(2000);
        const afterUrl = page.url();
        console.log(`[Login] URL après login: ${afterUrl}`);
        // Checkpoint de sécurité LinkedIn (vérification téléphonique, CAPTCHA, etc.)
        if (afterUrl.includes('/checkpoint')) {
            console.error('[Login] ⚠️  Checkpoint de sécurité LinkedIn détecté. Intervention manuelle requise.');
            console.error('[Login] Connectez-vous manuellement à LinkedIn depuis ce navigateur, puis relancez le worker.');
            return false;
        }
        if (afterUrl.includes('/feed') || afterUrl.includes('/mynetwork') || !afterUrl.includes('/login')) {
            console.log('[Login] ✅ Connexion LinkedIn réussie.');
            return true;
        }
        // Vérifier un message d'erreur sur la page
        const errorText = await page.evaluate(() => {
            const el = document.querySelector('.form__label--is-error, #error-for-username, #error-for-password, .alert-content');
            return el ? el.textContent?.trim() : null;
        });
        if (errorText) {
            console.error(`[Login] Erreur de connexion LinkedIn: ${errorText}`);
        }
        else {
            console.error('[Login] Connexion échouée pour une raison inconnue.');
        }
        return false;
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[Login] Exception pendant le login:', msg);
        return false;
    }
}
//# sourceMappingURL=browser.js.map