const { Server } = require('socket.io');
const logger = require('./logger');
const jwt = require('jsonwebtoken');

class WebSocketServer {
    constructor() {
        this.io = null;
        this.connectedClients = new Map();
    }

    /**
     * Initialise le serveur WebSocket
     * @param {Object} httpServer - Serveur HTTP Express
     */
    initialize(httpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000
        });

        // Middleware d'authentification pour les connexions admin
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;

            // Permettre les connexions publiques (sans token)
            if (!token) {
                socket.data.userType = 'public';
                return next();
            }

            // Vérifier le token pour les admins
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET, {
                    algorithms: ['HS256'],
                    issuer: 'terrain-tir-arc-server',
                    audience: 'terrain-tir-arc-client'
                });
                socket.data.userId = decoded.userId;
                socket.data.username = decoded.username;
                socket.data.userType = 'admin';
                next();
            } catch (error) {
                logger.warn('Token WebSocket invalide:', error.message);
                socket.data.userType = 'public';
                next();
            }
        });

        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });

        logger.info('✅ Serveur WebSocket initialisé');
    }

    /**
     * Gère une nouvelle connexion
     */
    handleConnection(socket) {
        const userType = socket.data.userType;
        const username = socket.data.username || 'anonymous';

        logger.info(`🔌 Nouvelle connexion WebSocket: ${socket.id} (${userType}: ${username})`);

        // Stocker la connexion
        this.connectedClients.set(socket.id, {
            socketId: socket.id,
            userType,
            username,
            connectedAt: new Date()
        });

        // Rejoindre la room appropriée
        if (userType === 'admin') {
            socket.join('admin-room');
            logger.debug(`👨‍💼 Admin ${username} a rejoint admin-room`);
        } else {
            socket.join('public-room');
        }

        // Envoyer les stats de connexion
        this.emitConnectionStats();

        // Événements
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });

        socket.on('disconnect', (reason) => {
            logger.info(`🔌 Déconnexion: ${socket.id} (${reason})`);
            this.connectedClients.delete(socket.id);
            this.emitConnectionStats();
        });

        // Événement de test pour vérifier la connexion
        socket.on('test', (data) => {
            logger.debug('Test WebSocket reçu:', data);
            socket.emit('test-response', { success: true, data });
        });
    }

    /**
     * Émet les statistiques de connexion aux admins
     */
    emitConnectionStats() {
        const stats = {
            total: this.connectedClients.size,
            admins: Array.from(this.connectedClients.values()).filter(c => c.userType === 'admin').length,
            public: Array.from(this.connectedClients.values()).filter(c => c.userType === 'public').length
        };

        this.io.to('admin-room').emit('connection-stats', stats);
    }

    /**
     * Notifie la création d'un nouvel incident
     */
    notifyNewIncident(incident) {
        if (!this.io) return;

        logger.info(`📢 Notification: Nouvel incident créé (ID: ${incident.id})`);

        // Notification aux admins avec tous les détails
        this.io.to('admin-room').emit('incident:created', {
            type: 'incident_created',
            timestamp: new Date().toISOString(),
            data: incident,
            message: `Nouveau signalement: ${incident.type_incident} (${incident.terrain})`
        });

        // Notification publique (sans détails sensibles)
        this.io.to('public-room').emit('incident:created-public', {
            type: 'incident_created',
            timestamp: new Date().toISOString(),
            message: 'Un nouvel incident a été signalé'
        });
    }

    /**
     * Notifie la mise à jour d'un incident
     */
    notifyIncidentUpdated(incident, oldStatus) {
        if (!this.io) return;

        logger.info(`📢 Notification: Incident mis à jour (ID: ${incident.id})`);

        this.io.to('admin-room').emit('incident:updated', {
            type: 'incident_updated',
            timestamp: new Date().toISOString(),
            data: incident,
            oldStatus,
            message: `Incident mis à jour: ${oldStatus} → ${incident.statut}`
        });
    }

    /**
     * Notifie la suppression d'un incident
     */
    notifyIncidentDeleted(incidentId) {
        if (!this.io) return;

        logger.info(`📢 Notification: Incident supprimé (ID: ${incidentId})`);

        this.io.to('admin-room').emit('incident:deleted', {
            type: 'incident_deleted',
            timestamp: new Date().toISOString(),
            data: { id: incidentId },
            message: 'Un incident a été supprimé'
        });
    }

    /**
     * Notifie la création d'une nouvelle session
     */
    notifyNewSession(session) {
        if (!this.io) return;

        logger.info(`📢 Notification: Nouvelle session (ID: ${session.id})`);

        // Notification à tous (public + admin)
        this.io.emit('session:created', {
            type: 'session_created',
            timestamp: new Date().toISOString(),
            data: {
                id: session.id,
                nom: session.nom,
                prenom: session.prenom,
                terrain: session.terrain,
                nombre_tireurs: session.nombre_tireurs,
                type_tireur: session.type_tireur
            },
            message: `${session.prenom} ${session.nom} a démarré une session (${session.terrain})`
        });

        // Mettre à jour les statistiques en temps réel
        this.updateLiveStats();
    }

    /**
     * Notifie la fin d'une session
     */
    notifySessionEnded(session) {
        if (!this.io) return;

        logger.info(`📢 Notification: Session terminée (ID: ${session.id})`);

        this.io.emit('session:ended', {
            type: 'session_ended',
            timestamp: new Date().toISOString(),
            data: {
                id: session.id,
                nom: session.nom,
                prenom: session.prenom,
                terrain: session.terrain,
                nombre_tireurs: session.nombre_tireurs
            },
            message: `${session.prenom} ${session.nom} a terminé sa session (${session.terrain})`
        });

        // Mettre à jour les statistiques en temps réel
        this.updateLiveStats();
    }

    /**
     * Met à jour les statistiques en temps réel
     */
    async updateLiveStats() {
        if (!this.io) return;

        try {
            const database = require('../config/database');

            // Stats des sessions actives
            const statsResult = await database.query(`
                SELECT
                    terrain,
                    COUNT(*) as sessions_count,
                    SUM(nombre_tireurs) as total_tireurs
                FROM sessions
                WHERE active = true
                GROUP BY terrain
            `);

            const stats = {
                interieur: { sessions: 0, tireurs: 0 },
                exterieur: { sessions: 0, tireurs: 0 }
            };

            statsResult.rows.forEach(row => {
                stats[row.terrain] = {
                    sessions: parseInt(row.sessions_count),
                    tireurs: parseInt(row.total_tireurs)
                };
            });

            // Émettre à tous les clients
            this.io.emit('stats:updated', {
                type: 'stats_updated',
                timestamp: new Date().toISOString(),
                data: stats
            });

        } catch (error) {
            logger.error('Erreur lors de la mise à jour des stats:', error);
        }
    }

    /**
     * Notifie un changement de configuration
     */
    notifyConfigUpdated(key, value) {
        if (!this.io) return;

        logger.info(`📢 Notification: Configuration mise à jour (${key})`);

        this.io.to('admin-room').emit('config:updated', {
            type: 'config_updated',
            timestamp: new Date().toISOString(),
            data: { key, value },
            message: `Configuration mise à jour: ${key}`
        });
    }

    /**
     * Envoie une notification personnalisée
     */
    sendCustomNotification(room, event, data) {
        if (!this.io) return;

        if (room === 'all') {
            this.io.emit(event, data);
        } else {
            this.io.to(room).emit(event, data);
        }
    }

    /**
     * Obtient les statistiques du serveur WebSocket
     */
    getStats() {
        const clients = Array.from(this.connectedClients.values());

        return {
            totalConnections: clients.length,
            adminConnections: clients.filter(c => c.userType === 'admin').length,
            publicConnections: clients.filter(c => c.userType === 'public').length,
            clients: clients.map(c => ({
                socketId: c.socketId,
                userType: c.userType,
                username: c.username,
                connectedAt: c.connectedAt
            }))
        };
    }
}

// Export singleton
const websocketServer = new WebSocketServer();
module.exports = websocketServer;
