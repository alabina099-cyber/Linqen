"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const queue_1 = require("./queue");
const browser_1 = require("./browser");
const connect_1 = require("./actions/connect");
const message_1 = require("./actions/message");
const visit_1 = require("./actions/visit");
const health_server_1 = require("./health-server");
const pg_1 = require("pg");
const config = {
    workerId: process.env.WORKER_ID || `worker-${process.env.HOSTNAME || Math.random().toString(36).slice(2, 8)}`,
    pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS || '5000', 10),
    claimTimeoutMs: parseInt(process.env.CLAIM_TIMEOUT_MS || '300000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    databaseUrl: process.env.DATABASE_URL || '',
    linkedinEmail: process.env.LINKEDIN_EMAIL,
    linkedinPassword: process.env.LINKEDIN_PASSWORD,
    headless: process.env.HEADLESS !== 'false',
    puppeteerArgs: process.env.PUPPETEER_ARGS?.split(',') || [],
};
let isShuttingDown = false;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 10;
const healthState = {
    workerId: config.workerId,
    startTime: Date.now(),
    lastPollAt: Date.now(),
    lastSuccessAt: null,
    consecutiveErrors: 0,
    totalProcessed: 0,
    totalSucceeded: 0,
    totalFailed: 0,
    isShuttingDown: false,
};
let healthServer = null;
/**
 * Gestion gracieuse des signaux d'arrêt (SIGTERM, SIGINT).
 */
function setupGracefulShutdown() {
    const shutdown = async (signal) => {
        console.log(`[${config.workerId}] Signal ${signal} reçu. Arrêt gracieux...`);
        isShuttingDown = true;
        healthState.isShuttingDown = true;
        try {
            if (healthServer) {
                await new Promise((resolve) => healthServer.close(() => resolve()));
            }
            await (0, browser_1.closeBrowser)();
            await (0, queue_1.closePool)();
        }
        catch (err) {
            console.error(`[${config.workerId}] Erreur pendant l'arrêt:`, err);
        }
        console.log(`[${config.workerId}] Arrêté.`);
        process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (err) => {
        console.error(`[${config.workerId}] Uncaught Exception:`, err);
        shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
        console.error(`[${config.workerId}] Unhandled Rejection:`, reason);
    });
}
/**
 * Boucle principale du worker.
 * 1. Récupère une action approuvée de la file d'attente
 * 2. Lance Chrome headless via Puppeteer
 * 3. Exécute l'action LinkedIn
 * 4. Met à jour le statut dans PostgreSQL
 */
async function processAction() {
    const action = await (0, queue_1.claimNextAction)(config.workerId);
    if (!action) {
        return;
    }
    console.log(`[${config.workerId}] Action #${action.id} [${action.action_type}] -> ${action.target_name || action.target_url}`);
    let result;
    const browser = await (0, browser_1.getBrowser)(config);
    const page = await (0, browser_1.createPage)(browser);
    try {
        switch (action.action_type) {
            case 'send_connection':
            case 'search_and_connection':
                result = await (0, connect_1.executeSendConnection)(page, action);
                break;
            case 'send_message':
            case 'search_and_message':
                result = await (0, message_1.executeSendMessage)(page, action);
                break;
            case 'visit_profile':
            case 'search':
                result = await (0, visit_1.executeVisitProfile)(page, action);
                break;
            default:
                result = { success: false, error: `Type d'action non supporté: ${action.action_type}` };
        }
        healthState.totalProcessed++;
        if (result.success) {
            await (0, queue_1.completeAction)(action.id, result);
            console.log(`[${config.workerId}] Action #${action.id} terminée avec succès.`);
            consecutiveErrors = 0;
            healthState.consecutiveErrors = 0;
            healthState.totalSucceeded++;
            healthState.lastSuccessAt = Date.now();
        }
        else {
            await (0, queue_1.failAction)(action.id, result.error || 'Erreur inconnue', result.details);
            console.warn(`[${config.workerId}] Action #${action.id} échouée: ${result.error}`);
            consecutiveErrors++;
            healthState.consecutiveErrors = consecutiveErrors;
            healthState.totalFailed++;
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await (0, queue_1.failAction)(action.id, `Exception worker: ${message}`);
        console.error(`[${config.workerId}] Exception sur action #${action.id}:`, message);
        consecutiveErrors++;
        healthState.consecutiveErrors = consecutiveErrors;
        healthState.totalFailed++;
    }
    finally {
        try {
            await page.close();
        }
        catch {
            // Ignorer les erreurs de fermeture de page
        }
    }
}
/**
 * Heartbeat périodique : signale au système que le worker est vivant.
 */
async function heartbeatLoop() {
    while (!isShuttingDown) {
        try {
            await (0, queue_1.updateWorkerHeartbeat)(config.workerId);
        }
        catch (err) {
            console.warn(`[${config.workerId}] Heartbeat échoué:`, err);
        }
        await sleep(30000); // Toutes les 30 secondes
    }
}
/**
 * Recovery périodique : libère les actions bloquées par des workers morts.
 */
async function recoveryLoop() {
    while (!isShuttingDown) {
        try {
            const released = await (0, queue_1.releaseStuckActions)(5);
            if (released > 0) {
                console.log(`[${config.workerId}] ${released} action(s) bloquée(s) libérée(s).`);
            }
        }
        catch (err) {
            console.warn(`[${config.workerId}] Recovery échoué:`, err);
        }
        await sleep(60000); // Toutes les minutes
    }
}
/**
 * Affiche les stats de la file d'attente périodiquement.
 */
async function statsLoop() {
    while (!isShuttingDown) {
        try {
            const stats = await (0, queue_1.getQueueStats)();
            const total = Object.values(stats).reduce((sum, n) => sum + n, 0);
            if (total > 0) {
                console.log(`[${config.workerId}] Queue stats:`, JSON.stringify(stats));
            }
        }
        catch (err) {
            // Silencieux
        }
        await sleep(300000); // Toutes les 5 minutes
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function main() {
    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║     LinkedIn Agent Worker                                ║`);
    console.log(`║     Worker ID : ${config.workerId.padEnd(40)} ║`);
    console.log(`║     Headless  : ${String(config.headless).padEnd(40)} ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
    if (!config.databaseUrl) {
        console.error(`[${config.workerId}] ERREUR: DATABASE_URL non définie.`);
        process.exit(1);
    }
    setupGracefulShutdown();
    // Vérification et connexion LinkedIn au démarrage
    if (config.linkedinEmail && config.linkedinPassword) {
        console.log(`[${config.workerId}] Vérification de la session LinkedIn...`);
        const loginBrowser = await (0, browser_1.getBrowser)(config);
        const loginPage = await (0, browser_1.createPage)(loginBrowser);
        try {
            const loggedIn = await (0, browser_1.isLoggedInToLinkedIn)(loginPage);
            if (!loggedIn) {
                console.log(`[${config.workerId}] Session LinkedIn inactive. Tentative de connexion...`);
                const success = await (0, browser_1.loginToLinkedIn)(loginPage, config.linkedinEmail, config.linkedinPassword);
                if (success) {
                    console.log(`[${config.workerId}] ✅ Connexion LinkedIn réussie.`);
                }
                else {
                    console.error(`[${config.workerId}] ❌ Connexion LinkedIn échouée. Vérifiez LINKEDIN_EMAIL et LINKEDIN_PASSWORD.`);
                    console.error(`[${config.workerId}] Le worker continuera mais les actions échoueront sans session active.`);
                }
            }
            else {
                console.log(`[${config.workerId}] ✅ Session LinkedIn active.`);
            }
        }
        catch (loginErr) {
            console.error(`[${config.workerId}] Erreur lors du check de connexion:`, loginErr);
        }
        finally {
            await loginPage.close().catch(() => { });
        }
    }
    else {
        console.warn(`[${config.workerId}] ⚠️  LINKEDIN_EMAIL / LINKEDIN_PASSWORD non définis. Mode extension Chrome uniquement.`);
    }
    // Lancer les boucles auxiliaires en parallèle
    heartbeatLoop();
    recoveryLoop();
    statsLoop();
    // Démarrer le serveur HTTP health/metrics
    const healthPort = parseInt(process.env.HEALTH_PORT || '9090', 10);
    const healthPool = new pg_1.Pool({
        connectionString: config.databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: 1,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
    });
    healthServer = (0, health_server_1.createHealthServer)(healthState, healthPool, healthPort);
    // Boucle principale
    while (!isShuttingDown) {
        healthState.lastPollAt = Date.now();
        try {
            await processAction();
        }
        catch (err) {
            console.error(`[${config.workerId}] Erreur dans la boucle principale:`, err);
            consecutiveErrors++;
            healthState.consecutiveErrors = consecutiveErrors;
        }
        // Si trop d'erreurs consécutives, attendre plus longtemps
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            console.error(`[${config.workerId}] Trop d'erreurs consécutives (${consecutiveErrors}). Pause de 60s.`);
            await sleep(60000);
            consecutiveErrors = 0;
        }
        else {
            await sleep(config.pollIntervalMs);
        }
    }
}
main();
//# sourceMappingURL=index.js.map