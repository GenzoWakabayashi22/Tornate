/**
 * MIDDLEWARE DI SICUREZZA AGGIUNTIVI - NON BREAKING
 *
 * Questi middleware AGGIUNGONO layer di sicurezza senza modificare
 * il comportamento esistente dell'app.
 *
 * Per attivarli, basta aggiungerli in server.js DOPO i middleware esistenti:
 * const securityMiddleware = require('./middleware/security');
 * app.use(securityMiddleware.requestLogger);
 * app.use(securityMiddleware.sanitizeInput);
 */

const logger = require('../config/logger');

/**
 * Request Logger Middleware
 * Logga tutte le richieste HTTP in modo strutturato
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();

    // Logga quando la risposta è completata
    res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Solo in production, usa logger strutturato
        if (process.env.NODE_ENV === 'production') {
            logger.logRequest(req, res, duration);
        }
    });

    next();
};

/**
 * Input Sanitization Middleware
 * Rimuove caratteri potenzialmente pericolosi da input utente
 * NON ROMPE NULLA: solo sanitizza, non blocca
 */
const sanitizeInput = (req, res, next) => {
    try {
        // Sanitizza body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }

        // Sanitizza query params
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeObject(req.query);
        }

        next();
    } catch (error) {
        logger.logError(error, { middleware: 'sanitizeInput' });
        // NON bloccare la richiesta, continua anche in caso di errore
        next();
    }
};

/**
 * Sanitizza ricorsivamente un oggetto
 */
function sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return sanitizeString(obj);
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            sanitized[key] = typeof obj[key] === 'object'
                ? sanitizeObject(obj[key])
                : sanitizeString(obj[key]);
        }
    }

    return sanitized;
}

/**
 * Sanitizza una stringa rimuovendo caratteri pericolosi
 */
function sanitizeString(value) {
    if (typeof value !== 'string') {
        return value;
    }

    // Rimuove script tags e altri pattern pericolosi
    return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
}

/**
 * Audit Log Middleware
 * Logga azioni importanti (create, update, delete)
 */
const auditLogger = (req, res, next) => {
    // Solo per operazioni modificanti
    const shouldAudit = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

    if (shouldAudit && req.session?.user) {
        const originalJson = res.json.bind(res);

        res.json = function (data) {
            // Logga solo se l'operazione ha successo
            if (data.success) {
                logger.audit(
                    `${req.method} ${req.path}`,
                    req.session.user.id || req.session.user.username,
                    {
                        ip: req.ip,
                        userAgent: req.get('user-agent'),
                        body: sanitizeForLog(req.body)
                    }
                );
            }

            return originalJson(data);
        };
    }

    next();
};

/**
 * Sanitizza dati per il log (rimuove password, token, etc)
 */
function sanitizeForLog(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = { ...obj };
    const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'api_key'];

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '***REDACTED***';
        }
    }

    return sanitized;
}

/**
 * Error Logging Middleware
 * Cattura errori e li logga in modo strutturato
 * DEVE essere aggiunto ALLA FINE di tutti i middleware
 */
const errorLogger = (err, req, res, next) => {
    // Logga l'errore
    logger.logError(err, {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userId: req.session?.user?.id
    });

    // Passa al prossimo error handler
    next(err);
};

/**
 * Security Headers Enhancer
 * Aggiunge header di sicurezza extra oltre a helmet
 */
const securityHeaders = (req, res, next) => {
    // Previeni clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Previeni MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Previeni XSS in browser vecchi
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions policy
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    next();
};

/**
 * Request ID Middleware
 * Aggiunge un ID univoco ad ogni richiesta per tracciamento
 */
const requestId = (req, res, next) => {
    req.id = generateRequestId();
    res.setHeader('X-Request-Id', req.id);
    next();
};

function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Timeout Middleware
 * Previene richieste che impiegano troppo tempo
 */
const requestTimeout = (timeout = 30000) => {
    return (req, res, next) => {
        // Imposta timeout
        req.setTimeout(timeout, () => {
            logger.warn('Request timeout', {
                method: req.method,
                path: req.path,
                timeout: `${timeout}ms`
            });

            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    error: 'Request timeout',
                    message: 'La richiesta ha impiegato troppo tempo'
                });
            }
        });

        next();
    };
};

/**
 * Response Time Middleware
 * Aggiunge header con tempo di risposta
 */
const responseTime = (req, res, next) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        res.setHeader('X-Response-Time', `${duration}ms`);

        // Log slow requests (>1s)
        if (duration > 1000) {
            logger.warn('Slow request detected', {
                method: req.method,
                path: req.path,
                duration: `${duration}ms`
            });
        }
    });

    next();
};

module.exports = {
    requestLogger,
    sanitizeInput,
    auditLogger,
    errorLogger,
    securityHeaders,
    requestId,
    requestTimeout,
    responseTime
};
