const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Middleware pour générer un nonce CSP unique par requête
const generateCspNonce = (req, res, next) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
    next();
};

// Configuration de sécurité Helmet avec nonces dynamiques
const helmetConfig = {
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            // Utilisation de nonces au lieu de 'unsafe-inline' pour une meilleure sécurité
            styleSrc: [
                "'self'",
                "https://fonts.googleapis.com",
                (req, res) => `'nonce-${res.locals.cspNonce}'`
            ],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: [
                "'self'",
                (req, res) => `'nonce-${res.locals.cspNonce}'`
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            workerSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false // Désactivé pour compatibilité
};

// Rate limiting global
const globalRateLimit = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Maximum 100 requêtes par fenêtre
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Trust proxy est géré au niveau de Express (app.set('trust proxy', true))
    // Pas besoin de désactiver validate avec cette configuration
    validate: {
        trustProxy: true,
        xForwardedForHeader: true
    },
    handler: (req, res) => {
        logger.security('Rate limit dépassé', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl
        });

        res.status(429).json({
            error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
            retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
        });
    }
});

// Rate limiting strict pour l'authentification
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Maximum 5 tentatives de connexion par IP
    skipSuccessfulRequests: true, // Ne pas compter les tentatives réussies
    message: {
        error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
        retryAfter: 15 * 60
    },
    // Trust proxy est géré au niveau de Express (app.set('trust proxy', true))
    validate: {
        trustProxy: true,
        xForwardedForHeader: true
    },
    handler: (req, res) => {
        logger.security('Tentatives de connexion excessives', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.originalUrl
        });

        res.status(429).json({
            error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
            retryAfter: 15 * 60
        });
    }
});

// Slow down pour ralentir les requêtes répétées
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Permettre 50 requêtes par fenêtre sans délai
    delayMs: 500, // Ajouter 500ms de délai par requête après delayAfter
    maxDelayMs: 20000, // Maximum 20 secondes de délai
    onLimitReached: (req) => {
        logger.security('Speed limit atteint', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            url: req.originalUrl
        });
    }
});

// Middleware pour détecter les tentatives d'attaque
const attackDetection = (req, res, next) => {
    const suspiciousPatterns = [
        /(<script|<iframe|<object|<embed)/i,
        /(union\s+select|drop\s+table|insert\s+into)/i,
        /(\.\.\.|\.\.\/)/,
        /(exec\(|eval\(|javascript:)/i,
        /(\bor\b.*=.*\bor\b|\band\b.*=.*\band\b)/i
    ];

    const userAgent = req.get('User-Agent') || '';
    const queryString = JSON.stringify(req.query);
    const body = JSON.stringify(req.body);
    const url = req.originalUrl;

    // Détecter les User-Agents suspects
    // En mode développement, on autorise curl et wget
    const suspiciousUserAgents = process.env.NODE_ENV === 'production' ? [
        /sqlmap/i,
        /nmap/i,
        /nikto/i,
        /burpsuite/i,
        /python-requests/i,
        /curl/i,
        /wget/i
    ] : [
        /sqlmap/i,
        /nmap/i,
        /nikto/i,
        /burpsuite/i
    ];

    const isSuspiciousUserAgent = suspiciousUserAgents.some(pattern => pattern.test(userAgent));
    const hasSuspiciousContent = suspiciousPatterns.some(pattern =>
        pattern.test(queryString) || pattern.test(body) || pattern.test(url)
    );

    if (isSuspiciousUserAgent || hasSuspiciousContent) {
        logger.security('Tentative d\'attaque détectée', {
            ip: req.ip,
            userAgent,
            url,
            query: req.query,
            body: req.body,
            suspiciousUserAgent: isSuspiciousUserAgent,
            suspiciousContent: hasSuspiciousContent
        });

        return res.status(403).json({
            error: 'Requête suspecte détectée'
        });
    }

    next();
};

// Middleware pour logs de sécurité
const securityLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            referer: req.get('Referer'),
            contentLength: res.get('Content-Length')
        };

        // Logger les requêtes suspectes ou les erreurs
        if (res.statusCode >= 400 || duration > 5000) {
            logger.security('Requête surveillée', logData);
        } else {
            logger.http('Requête HTTP', logData);
        }
    });

    next();
};

// Middleware pour valider l'origine des requêtes
const originValidation = (req, res, next) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
    const origin = req.get('Origin');
    const referer = req.get('Referer');

    // Permettre les requêtes sans Origin (requêtes directes, Postman, etc.) en développement
    if (process.env.NODE_ENV === 'development' && !origin) {
        return next();
    }

    if (origin && !allowedOrigins.includes(origin)) {
        logger.security('Origine non autorisée', {
            ip: req.ip,
            origin,
            referer,
            userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
            error: 'Origine non autorisée'
        });
    }

    next();
};

// Middleware pour nettoyer les en-têtes sensibles
const sanitizeHeaders = (req, res, next) => {
    // Supprimer les en-têtes sensibles de la réponse
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    next();
};

module.exports = {
    generateCspNonce,
    helmet: helmet(helmetConfig),
    globalRateLimit,
    authRateLimit,
    speedLimiter,
    attackDetection,
    securityLogger,
    originValidation,
    sanitizeHeaders
};