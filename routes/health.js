/**
 * HEALTH CHECK ROUTES - NON BREAKING
 *
 * Endpoint per monitoraggio dello stato dell'applicazione.
 * Utile per load balancer, monitoring tools, e deployment automation.
 *
 * Per attivarli, aggiungi in server.js:
 * app.use('/health', require('./routes/health'));
 */

const express = require('express');
const router = express.Router();
const { testConnection } = require('../config/database');
const logger = require('../config/logger');

/**
 * GET /health - Health check basico
 * Ritorna 200 se l'app è in esecuzione
 */
router.get('/', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /health/live - Liveness probe
 * Per Kubernetes/Docker: verifica se il processo è attivo
 */
router.get('/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /health/ready - Readiness probe
 * Verifica se l'app è pronta a ricevere traffico (DB connesso, etc)
 */
router.get('/ready', async (req, res) => {
    try {
        // Verifica connessione database
        const dbConnected = await testConnection();

        if (dbConnected) {
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'UP'
                }
            });
        } else {
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'DOWN'
                }
            });
        }
    } catch (error) {
        logger.logError(error, { endpoint: '/health/ready' });
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /health/detailed - Health check dettagliato
 * Include info su uptime, memoria, versione, etc
 */
router.get('/detailed', async (req, res) => {
    try {
        const dbConnected = await testConnection();

        const memoryUsage = process.memoryUsage();
        const uptime = process.uptime();

        // Calcola percentuale memoria usata
        const totalMemory = memoryUsage.heapTotal;
        const usedMemory = memoryUsage.heapUsed;
        const memoryPercent = ((usedMemory / totalMemory) * 100).toFixed(2);

        const health = {
            status: dbConnected ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            version: require('../package.json').version || '1.0.0',
            uptime: {
                seconds: Math.floor(uptime),
                human: formatUptime(uptime)
            },
            memory: {
                used: `${(usedMemory / 1024 / 1024).toFixed(2)} MB`,
                total: `${(totalMemory / 1024 / 1024).toFixed(2)} MB`,
                percent: `${memoryPercent}%`
            },
            checks: {
                database: dbConnected ? 'UP' : 'DOWN',
                process: 'UP'
            },
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version,
            pid: process.pid
        };

        // Status code basato sullo stato
        const statusCode = health.status === 'healthy' ? 200 : 503;

        res.status(statusCode).json(health);

    } catch (error) {
        logger.logError(error, { endpoint: '/health/detailed' });
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

/**
 * GET /health/metrics - Metriche base per monitoring
 */
router.get('/metrics', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    res.json({
        timestamp: new Date().toISOString(),
        uptime_seconds: Math.floor(process.uptime()),
        memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external
        },
        cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
        },
        process: {
            pid: process.pid,
            version: process.version,
            platform: process.platform,
            arch: process.arch
        }
    });
});

/**
 * Helper: Formatta uptime in modo leggibile
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);

    return parts.join(' ');
}

module.exports = router;
