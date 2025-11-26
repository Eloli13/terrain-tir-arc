/**
 * WebSocket Client pour les notifications temps réel
 * Utilise Socket.io pour la communication avec le serveur
 */
class WebSocketClient {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.eventHandlers = new Map();
        this.notificationHistory = [];
        this.maxHistorySize = 50;
        this.storageKey = 'websocket_notification_history';

        // Charger l'historique depuis localStorage
        this.loadFromLocalStorage();
    }

    /**
     * Initialise la connexion WebSocket
     */
    connect() {
        const token = this.getAuthToken();

        this.socket = io({
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: this.maxReconnectAttempts
        });

        this.setupEventListeners();
        Logger.info('WebSocket client initialisé');
    }

    /**
     * Configure les écouteurs d'événements Socket.io
     */
    setupEventListeners() {
        // Connexion établie
        this.socket.on('connect', () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            Logger.info('✅ WebSocket connecté', this.socket.id);
            this.emit('connection-status', { connected: true, socketId: this.socket.id });
        });

        // Déconnexion
        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            Logger.warn('WebSocket déconnecté:', reason);
            this.emit('connection-status', { connected: false, reason });
        });

        // Erreur de connexion
        this.socket.on('connect_error', (error) => {
            this.reconnectAttempts++;
            Logger.error('Erreur connexion WebSocket:', error.message);

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                Logger.error('Nombre maximum de tentatives de reconnexion atteint');
                this.emit('connection-failed', { attempts: this.reconnectAttempts });
            }
        });

        // Événements personnalisés
        this.setupCustomEvents();
    }

    /**
     * Configure les événements métier
     */
    setupCustomEvents() {
        // Incidents
        this.socket.on('incident:created', (data) => {
            Logger.info('📢 Incident créé:', data);
            this.addToHistory(data);
            this.emit('incident:created', data);
        });

        this.socket.on('incident:updated', (data) => {
            Logger.info('📢 Incident mis à jour:', data);
            this.addToHistory(data);
            this.emit('incident:updated', data);
        });

        this.socket.on('incident:deleted', (data) => {
            Logger.info('📢 Incident supprimé:', data);
            this.addToHistory(data);
            this.emit('incident:deleted', data);
        });

        // Sessions
        this.socket.on('session:created', (data) => {
            Logger.info('📢 Session créée:', data);
            this.addToHistory(data);
            this.emit('session:created', data);
        });

        this.socket.on('session:ended', (data) => {
            Logger.info('📢 Session terminée:', data);
            this.addToHistory(data);
            this.emit('session:ended', data);
        });

        // Stats
        this.socket.on('stats:updated', (data) => {
            Logger.debug('📊 Stats mises à jour:', data);
            this.emit('stats:updated', data);
        });

        // Configuration
        this.socket.on('config:updated', (data) => {
            Logger.info('⚙️ Configuration mise à jour:', data);
            this.addToHistory(data);
            this.emit('config:updated', data);
        });

        // Ping/Pong pour test
        this.socket.on('pong', (data) => {
            Logger.debug('🏓 Pong reçu:', data);
        });
    }

    /**
     * Ajoute une notification à l'historique
     */
    addToHistory(notification) {
        notification.receivedAt = new Date().toISOString();
        notification.read = false;
        notification.id = this.generateNotificationId();

        this.notificationHistory.unshift(notification);

        // Limiter la taille de l'historique
        if (this.notificationHistory.length > this.maxHistorySize) {
            this.notificationHistory = this.notificationHistory.slice(0, this.maxHistorySize);
        }

        this.saveToLocalStorage();
        this.emit('history-updated', this.notificationHistory);
    }

    /**
     * Génère un ID unique pour une notification
     */
    generateNotificationId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Récupère le token d'authentification
     */
    getAuthToken() {
        // Essayer de récupérer le token depuis DatabaseManager si disponible
        if (typeof DatabaseManager !== 'undefined') {
            return DatabaseManager.getAuthToken();
        }
        // Sinon depuis localStorage
        return localStorage.getItem('auth_token');
    }

    /**
     * Enregistre un gestionnaire d'événement
     */
    on(event, callback) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(callback);
    }

    /**
     * Supprime un gestionnaire d'événement
     */
    off(event, callback) {
        if (!this.eventHandlers.has(event)) return;

        const handlers = this.eventHandlers.get(event);
        const index = handlers.indexOf(callback);
        if (index > -1) {
            handlers.splice(index, 1);
        }
    }

    /**
     * Émet un événement aux gestionnaires enregistrés
     */
    emit(event, data) {
        if (!this.eventHandlers.has(event)) return;

        const handlers = this.eventHandlers.get(event);
        handlers.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                Logger.error(`Erreur dans le handler ${event}:`, error);
            }
        });
    }

    /**
     * Envoie un événement au serveur
     */
    send(event, data) {
        if (!this.connected) {
            Logger.warn('WebSocket non connecté, impossible d\'envoyer:', event);
            return;
        }
        this.socket.emit(event, data);
    }

    /**
     * Test de connexion (ping)
     */
    ping() {
        this.send('ping');
    }

    /**
     * Récupère l'historique des notifications
     */
    getHistory() {
        return this.notificationHistory;
    }

    /**
     * Récupère les notifications non lues
     */
    getUnreadNotifications() {
        return this.notificationHistory.filter(n => !n.read);
    }

    /**
     * Marque une notification comme lue
     */
    markAsRead(notificationId) {
        const notification = this.notificationHistory.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveToLocalStorage();
            this.emit('history-updated', this.notificationHistory);
        }
    }

    /**
     * Marque toutes les notifications comme lues
     */
    markAllAsRead() {
        this.notificationHistory.forEach(n => n.read = true);
        this.saveToLocalStorage();
        this.emit('history-updated', this.notificationHistory);
    }

    /**
     * Supprime une notification de l'historique
     */
    removeNotification(notificationId) {
        const index = this.notificationHistory.findIndex(n => n.id === notificationId);
        if (index > -1) {
            this.notificationHistory.splice(index, 1);
            this.saveToLocalStorage();
            this.emit('history-updated', this.notificationHistory);
        }
    }

    /**
     * Efface tout l'historique
     */
    clearHistory() {
        this.notificationHistory = [];
        this.saveToLocalStorage();
        this.emit('history-updated', this.notificationHistory);
    }

    /**
     * Déconnexion propre
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.connected = false;
            Logger.info('WebSocket déconnecté');
        }
    }

    /**
     * Vérifie si le WebSocket est connecté
     */
    isConnected() {
        return this.connected && this.socket && this.socket.connected;
    }

    /**
     * Obtient l'ID du socket
     */
    getSocketId() {
        return this.socket ? this.socket.id : null;
    }

    /**
     * Sauvegarde l'historique dans localStorage
     */
    saveToLocalStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.notificationHistory));
            Logger.debug('Historique de notifications sauvegardé');
        } catch (error) {
            Logger.error('Erreur lors de la sauvegarde des notifications:', error);
        }
    }

    /**
     * Charge l'historique depuis localStorage
     */
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.notificationHistory = JSON.parse(stored);
                Logger.info(`${this.notificationHistory.length} notification(s) chargée(s) depuis localStorage`);
            }
        } catch (error) {
            Logger.error('Erreur lors du chargement des notifications:', error);
            this.notificationHistory = [];
        }
    }
}

// Export pour utilisation globale
if (typeof window !== 'undefined') {
    window.WebSocketClient = WebSocketClient;
}
