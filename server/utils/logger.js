const winston = require('winston');
const path = require('path');

// Créer le dossier de logs s'il n'existe pas
const logDir = path.join(__dirname, '..', 'logs');
require('fs').mkdirSync(logDir, { recursive: true });

// Configuration des niveaux de logs personnalisés
const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        debug: 4,
        security: 5
    },
    colors: {
        error: 'red',
        warn: 'yellow',
        info: 'green',
        http: 'magenta',
        debug: 'blue',
        security: 'cyan'
    }
};

// Ajouter les couleurs
winston.addColors(customLevels.colors);

// Format personnalisé pour les logs
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf((info) => {
        const { timestamp, level, message, stack, ...meta } = info;
        let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        if (Object.keys(meta).length) {
            logMessage += ` ${JSON.stringify(meta)}`;
        }

        if (stack) {
            logMessage += `\n${stack}`;
        }

        return logMessage;
    })
);

// Format pour la console (plus lisible)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        let logMessage = `${timestamp} ${level}: ${message}`;

        if (Object.keys(meta).length) {
            logMessage += ` ${JSON.stringify(meta, null, 2)}`;
        }

        return logMessage;
    })
);

// Configuration des transports
const transports = [
    // Log tous les niveaux dans un fichier
    new winston.transports.File({
        filename: path.join(logDir, 'app.log'),
        level: process.env.LOG_LEVEL || 'info',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
    }),

    // Log uniquement les erreurs dans un fichier séparé
    new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true
    }),

    // Log de sécurité dans un fichier dédié
    new winston.transports.File({
        filename: path.join(logDir, 'security.log'),
        level: 'security',
        format: logFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        tailable: true
    })
];

// Ajouter la console en mode développement
if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.Console({
            level: 'debug',
            format: consoleFormat
        })
    );
}

// Créer le logger
const logger = winston.createLogger({
    levels: customLevels.levels,
    format: logFormat,
    defaultMeta: {
        service: 'terrain-tir-arc-server',
        version: process.env.npm_package_version || '1.0.0'
    },
    transports,
    exitOnError: false
});

// Fonction helper pour les logs de sécurité
logger.security = (message, meta = {}) => {
    logger.log('security', message, {
        ...meta,
        timestamp: new Date().toISOString(),
        category: 'security'
    });
};

// Fonction helper pour les logs HTTP
logger.http = (message, meta = {}) => {
    logger.log('http', message, {
        ...meta,
        timestamp: new Date().toISOString(),
        category: 'http'
    });
};

// Middleware pour capturer les erreurs non gérées
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = logger;