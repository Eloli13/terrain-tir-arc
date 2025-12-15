require('dotenv').config();

// Valider les variables d'environnement AVANT tout import
const { validateEnvironment } = require('./utils/env-validator');
validateEnvironment();

const express = require('express');
const http = require('http');
const cors = require('cors');
const compression = require('compression');

// Modules internes
const database = require('./config/database');
const logger = require('./utils/logger');
const websocketServer = require('./utils/websocket');
const {
    generateCspNonce,
    helmet,
    globalRateLimit,
    speedLimiter,
    attackDetection,
    securityLogger,
    originValidation,
    sanitizeHeaders
} = require('./middleware/security');
const { sanitizeInput, limitRequestSize } = require('./middleware/validation');

// Routes v1 (versioning API)
const authRoutes = require('./routes/auth');
const sessionsRoutes = require('./routes/sessions');
const incidentsRoutes = require('./routes/incidents');
const configRoutes = require('./routes/config');
const emailConfigRoutes = require('./routes/email-config');
const securityRoutes = require('./routes/security');

const app = express();
const PORT = process.env.PORT || 3000;

// Faire confiance au proxy Nginx pour les headers X-Forwarded-*
app.set('trust proxy', true);

// Initialisation de l'application
async function initializeApp() {
    try {
        logger.info('Initialisation du serveur...');

        // Test de connexion à la base de données
        await database.init();

        // Configuration des middlewares de sécurité (ordre important)
        app.use(sanitizeHeaders);
        app.use(generateCspNonce); // Générer le nonce AVANT helmet
        app.use(helmet);
        app.use(securityLogger);
        app.use(attackDetection);
        app.use(globalRateLimit);
        app.use(speedLimiter);

        // Configuration CORS
        const corsOptions = {
            origin: function (origin, callback) {
                const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(o => o.trim());

                // Permettre les requêtes sans origine en développement
                if (process.env.NODE_ENV === 'development' && !origin) {
                    return callback(null, true);
                }

                if (allowedOrigins.length === 0) {
                    // Si aucune origine n'est configurée, refuser par défaut
                    return callback(new Error('CORS not configured'), false);
                }

                if (origin && allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'), false);
                }
            },
            credentials: true,
            optionsSuccessStatus: 200,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        };

        app.use(cors(corsOptions));

        // Middlewares généraux
        app.use(compression()); // Compression gzip
        app.use(limitRequestSize('10mb')); // Limite de taille des requêtes
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));
        // Protection XSS intelligente : détecte les vraies attaques sans corrompre les données
        app.use(sanitizeInput);

        // Servir les fichiers uploadés (photos incidents)
        app.use('/uploads', express.static('uploads'));

        // Routes API v1 (versionnées)
        app.use('/api/v1/auth', authRoutes);
        app.use('/api/v1/sessions', sessionsRoutes);
        app.use('/api/v1/incidents', incidentsRoutes);
        app.use('/api/v1/config', configRoutes);
        app.use('/api/v1/email-config', emailConfigRoutes);
        app.use('/api/v1/security', securityRoutes);

        // Routes sans version (rétro-compatibilité) - Redirigent vers v1
        app.use('/api/auth', authRoutes);
        app.use('/api/sessions', sessionsRoutes);
        app.use('/api/incidents', incidentsRoutes);
        app.use('/api/config', configRoutes);
        app.use('/api/email-config', emailConfigRoutes);
        app.use('/api/security', securityRoutes);

        // Route de santé (health check)
        app.get('/health', async (req, res) => {
            try {
                // Test de connexion base de données
                await database.query('SELECT 1');

                res.json({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    version: process.env.npm_package_version || '1.0.0',
                    environment: process.env.NODE_ENV || 'development',
                    uptime: process.uptime()
                });

            } catch (error) {
                logger.error('Health check échoué:', error);
                res.status(503).json({
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: 'Database connection failed'
                });
            }
        });

        // Route de métriques système (pour monitoring)
        app.get('/metrics', async (req, res) => {
            const memoryUsage = process.memoryUsage();

            try {
                // Statistiques de base de données
                const activeSessionsResult = await database.query(`
                    SELECT COUNT(*) as count FROM sessions WHERE active = true
                `);

                const pendingIncidentsResult = await database.query(`
                    SELECT COUNT(*) as count FROM incidents WHERE statut = 'en_attente'
                `);

                res.json({
                    system: {
                        uptime: process.uptime(),
                        memory: {
                            rss: memoryUsage.rss,
                            heapTotal: memoryUsage.heapTotal,
                            heapUsed: memoryUsage.heapUsed,
                            external: memoryUsage.external
                        },
                        cpu: process.cpuUsage(),
                        nodeVersion: process.version,
                        platform: process.platform
                    },
                    application: {
                        activeSessions: parseInt(activeSessionsResult.rows[0].count),
                        pendingIncidents: parseInt(pendingIncidentsResult.rows[0].count),
                        environment: process.env.NODE_ENV || 'development'
                    },
                    websocket: websocketServer.getStats(),
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('Erreur lors de la récupération des métriques:', error);
                res.status(500).json({
                    error: 'Erreur lors de la récupération des métriques',
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Route par défaut
        app.get('/', (req, res) => {
            res.json({
                message: 'Serveur de gestion des terrains de tir à l\'arc',
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                documentation: '/api/docs',
                health: '/health',
                metrics: '/metrics'
            });
        });

        // Documentation API simple
        app.get('/api/docs', (req, res) => {
            res.json({
                title: 'API de gestion des terrains de tir à l\'arc',
                apiVersion: 'v1',
                version: '1.0.0',
                description: 'API sécurisée pour la gestion des sessions et incidents',
                baseUrl: '/api/v1',
                note: 'Les routes /api/* (sans version) sont maintenues pour rétro-compatibilité et pointent vers v1',
                endpoints: {
                    auth: {
                        'POST /api/v1/auth/login': 'Connexion administrateur',
                        'POST /api/v1/auth/refresh': 'Renouvellement du token',
                        'POST /api/v1/auth/logout': 'Déconnexion',
                        'GET /api/v1/auth/me': 'Informations utilisateur connecté'
                    },
                    sessions: {
                        'GET /api/v1/sessions': 'Liste des sessions avec filtres',
                        'POST /api/v1/sessions': 'Créer une nouvelle session',
                        'GET /api/v1/sessions/active': 'Sessions actives uniquement',
                        'GET /api/v1/sessions/stats': 'Statistiques des sessions',
                        'PUT /api/v1/sessions/:id': 'Mettre à jour une session',
                        'DELETE /api/v1/sessions/:id': 'Supprimer une session'
                    },
                    incidents: {
                        'GET /api/v1/incidents': 'Liste des incidents avec filtres',
                        'POST /api/v1/incidents': 'Signaler un nouvel incident',
                        'POST /api/v1/incidents/upload': 'Signaler un incident avec photo',
                        'GET /api/v1/incidents/stats': 'Statistiques des incidents',
                        'PUT /api/v1/incidents/:id': 'Mettre à jour un incident',
                        'DELETE /api/v1/incidents/:id': 'Supprimer un incident'
                    },
                    config: {
                        'GET /api/v1/config': 'Toute la configuration',
                        'GET /api/v1/config/:key': 'Une valeur de configuration',
                        'PUT /api/v1/config': 'Mettre à jour la configuration',
                        'POST /api/v1/config/validate': 'Valider la configuration'
                    },
                    emailConfig: {
                        'GET /api/v1/email-config': 'Configuration email actuelle',
                        'PUT /api/v1/email-config': 'Mettre à jour configuration email',
                        'POST /api/v1/email-config/test': 'Tester configuration email',
                        'DELETE /api/v1/email-config': 'Désactiver notifications email'
                    },
                    security: {
                        'GET /api/v1/security/status': 'Statut de sécurité du système (admin)',
                        'GET /api/v1/security/audit-logs': 'Logs d\'audit avec filtres (admin)',
                        'POST /api/v1/security/test-audit': 'Créer une entrée de test (admin)',
                        'GET /api/v1/security/active-sessions': 'Lister toutes les sessions actives (admin)',
                        'DELETE /api/v1/security/revoke-session/:id': 'Révoquer une session (admin)'
                    }
                },
                authentication: 'Bearer JWT Token requis pour toutes les routes sauf /health et signalement incidents',
                security: {
                    https: 'Obligatoire en production',
                    rateLimit: '100 requêtes par 15 minutes',
                    authLimit: '5 tentatives par 15 minutes',
                    headers: 'Helmet.js pour les en-têtes de sécurité'
                }
            });
        });

        // Middleware de gestion d'erreurs 404
        app.use('*', (req, res) => {
            logger.security('Route non trouvée', {
                url: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.status(404).json({
                error: 'Route non trouvée',
                message: `La route ${req.method} ${req.originalUrl} n'existe pas`,
                documentation: '/api/docs'
            });
        });

        // Middleware de gestion d'erreurs globales
        app.use((error, req, res, next) => {
            logger.error('Erreur non gérée:', {
                error: error.message,
                stack: error.stack,
                url: req.originalUrl,
                method: req.method,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            // Ne pas exposer les détails d'erreur en production
            const isDevelopment = process.env.NODE_ENV === 'development';

            res.status(error.status || 500).json({
                error: error.status === 404 ? 'Route non trouvée' : 'Erreur interne du serveur',
                ...(isDevelopment && {
                    message: error.message,
                    stack: error.stack
                }),
                timestamp: new Date().toISOString()
            });
        });

        // Créer le serveur HTTP
        const server = http.createServer(app);

        // Initialiser WebSocket
        websocketServer.initialize(server);

        // Démarrage du serveur
        server.listen(PORT, () => {
            logger.info(`Serveur démarré sur le port ${PORT}`, {
                environment: process.env.NODE_ENV || 'development',
                port: PORT,
                cors: process.env.ALLOWED_ORIGINS || 'Non configuré'
            });

            logger.security('Serveur démarré avec WebSocket', {
                port: PORT,
                environment: process.env.NODE_ENV || 'development'
            });
        });

        // Gestion propre de l'arrêt du serveur
        const gracefulShutdown = async (signal) => {
            logger.info(`Signal ${signal} reçu, arrêt du serveur...`);

            server.close(async () => {
                logger.info('Serveur HTTP fermé');

                try {
                    await database.close();
                    logger.info('Connexion à la base de données fermée');
                    process.exit(0);
                } catch (error) {
                    logger.error('Erreur lors de la fermeture de la base de données:', error);
                    process.exit(1);
                }
            });

            // Force l'arrêt après 10 secondes
            setTimeout(() => {
                logger.error('Force l\'arrêt du serveur après timeout');
                process.exit(1);
            }, 10000);
        };

        // Écouter les signaux d'arrêt
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        return server;

    } catch (error) {
        logger.error('Erreur lors de l\'initialisation du serveur:', error);
        process.exit(1);
    }
}

// Démarrer l'application
if (require.main === module) {
    initializeApp();
}

module.exports = { app, initializeApp, websocketServer };