"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthServer = createHealthServer;
// =============================================
// HTTP Health & Metrics server pour le worker
// - GET /health  → 200 si la boucle de polling et la DB sont vivantes
// - GET /ready   → 200 si le worker peut traiter une action (DB OK)
// - GET /metrics → format Prometheus minimal (texte)
// =============================================
const http_1 = __importDefault(require("http"));
const STALE_POLL_MS = 5 * 60 * 1000; // 5 min sans poll = stale
function createHealthServer(state, pool, port) {
    const server = http_1.default.createServer(async (req, res) => {
        const url = req.url || '/';
        if (url === '/health') {
            const now = Date.now();
            const sincePoll = now - state.lastPollAt;
            const stale = sincePoll > STALE_POLL_MS;
            const status = state.isShuttingDown
                ? 503
                : stale
                    ? 503
                    : 200;
            res.writeHead(status, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: status === 200 ? 'healthy' : 'unhealthy',
                workerId: state.workerId,
                uptimeSec: Math.floor((now - state.startTime) / 1000),
                lastPollAgoMs: sincePoll,
                consecutiveErrors: state.consecutiveErrors,
                stale,
                shuttingDown: state.isShuttingDown,
            }));
            return;
        }
        if (url === '/ready') {
            try {
                await pool.query('SELECT 1');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ready: true }));
            }
            catch (err) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    ready: false,
                    error: err instanceof Error ? err.message : String(err),
                }));
            }
            return;
        }
        if (url === '/metrics') {
            const lines = [
                `# HELP worker_up 1 if worker is running and not shutting down`,
                `# TYPE worker_up gauge`,
                `worker_up{worker_id="${state.workerId}"} ${state.isShuttingDown ? 0 : 1}`,
                `# HELP worker_uptime_seconds Worker uptime in seconds`,
                `# TYPE worker_uptime_seconds counter`,
                `worker_uptime_seconds{worker_id="${state.workerId}"} ${Math.floor((Date.now() - state.startTime) / 1000)}`,
                `# HELP worker_actions_processed_total Total actions processed`,
                `# TYPE worker_actions_processed_total counter`,
                `worker_actions_processed_total{worker_id="${state.workerId}"} ${state.totalProcessed}`,
                `# HELP worker_actions_succeeded_total Successful actions`,
                `# TYPE worker_actions_succeeded_total counter`,
                `worker_actions_succeeded_total{worker_id="${state.workerId}"} ${state.totalSucceeded}`,
                `# HELP worker_actions_failed_total Failed actions`,
                `# TYPE worker_actions_failed_total counter`,
                `worker_actions_failed_total{worker_id="${state.workerId}"} ${state.totalFailed}`,
                `# HELP worker_consecutive_errors Current streak of consecutive errors`,
                `# TYPE worker_consecutive_errors gauge`,
                `worker_consecutive_errors{worker_id="${state.workerId}"} ${state.consecutiveErrors}`,
                `# HELP worker_last_poll_age_ms Milliseconds since last queue poll`,
                `# TYPE worker_last_poll_age_ms gauge`,
                `worker_last_poll_age_ms{worker_id="${state.workerId}"} ${Date.now() - state.lastPollAt}`,
            ];
            res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
            res.end(lines.join('\n') + '\n');
            return;
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    });
    server.listen(port, () => {
        console.log(`[${state.workerId}] Health server listening on :${port}`);
    });
    return server;
}
//# sourceMappingURL=health-server.js.map