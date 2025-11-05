/**
 * LOGGER STRUTTURATO - NON BREAKING
 *
 * Questo modulo AFFIANCA i console.log esistenti, non li sostituisce.
 * Usa winston per logging strutturato in produzione.
 *
 * IMPORTANTE: Il codice esistente continua a funzionare normalmente!
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crea directory logs se non esiste
const logDir = process.env.LOG_DIR || './logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Formato personalizzato
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(info => {
        const { timestamp, level, message, ...meta } = info;
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        // Aggiungi metadata se presente
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }

        return log;
    })
);

// Configurazione logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    transports: [
        // File per errori
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File per tutti i log
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 10
        })
    ]
});

// In development, aggiungi anche console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// ✅ WRAPPER FUNCTION - COMPATIBILE CON CODICE ESISTENTE
// Puoi usare logger come drop-in replacement di console
logger.log = (level, ...args) => {
    const message = args.join(' ');
    logger[level] || logger.info(message);
};

// ✅ HELPER per logging strutturato con context
logger.logWithContext = (level, message, context = {}) => {
    logger[level](message, {
        ...context,
        timestamp: new Date().toISOString(),
        pid: process.pid
    });
};

// ✅ HELPER per logging richieste HTTP
logger.logRequest = (req, res, duration) => {
    logger.info('HTTP Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
};

// ✅ HELPER per logging errori con stack trace
logger.logError = (error, context = {}) => {
    logger.error(error.message, {
        ...context,
        stack: error.stack,
        name: error.name,
        code: error.code
    });
};

// ✅ HELPER per audit log (azioni admin)
logger.audit = (action, userId, details = {}) => {
    logger.info('AUDIT', {
        action,
        userId,
        ...details,
        timestamp: new Date().toISOString()
    });
};

module.exports = logger;
