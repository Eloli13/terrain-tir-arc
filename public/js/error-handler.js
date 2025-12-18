// Gestionnaire d'erreurs centralisé
class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.isOnline = navigator.onLine;
        this.setupGlobalHandlers();
        this.setupNetworkMonitoring();
    }

    // Helper pour logger avec fallback vers console si Logger n'est pas disponible
    _log(level, ...args) {
        if (typeof Logger !== 'undefined' && Logger[level]) {
            Logger[level](...args);
        } else {
            console[level](...args);
        }
    }

    // Configuration des gestionnaires globaux
    setupGlobalHandlers() {
        // Erreurs JavaScript non capturées
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // Promesses rejetées non gérées
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'promise',
                message: event.reason?.message || event.reason,
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            });
        });

        // Erreurs de ressources (images, scripts, etc.)
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleError({
                    type: 'resource',
                    message: `Erreur de chargement: ${event.target.tagName}`,
                    source: event.target.src || event.target.href,
                    timestamp: new Date().toISOString()
                }, true);
            }
        }, true);
    }

    // Surveillance du réseau
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('Connexion Internet rétablie', 'success');
            this.syncPendingErrors();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('Connexion Internet perdue', 'warning');
        });
    }

    // Gestion centralisée des erreurs
    handleError(error, silent = false) {
        // Ajouter à la liste des erreurs
        this.errors.unshift({
            id: Date.now(),
            ...error
        });

        // Limiter le nombre d'erreurs stockées
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(0, this.maxErrors);
        }

        // Logger l'erreur
        this.logError(error);

        // Afficher notification si pas en mode silencieux
        if (!silent) {
            this.showErrorNotification(error);
        }

        // Envoyer au serveur si en ligne
        if (this.isOnline) {
            this.sendErrorToServer(error);
        } else {
            this.storeErrorForLater(error);
        }
    }

    // Logger les erreurs
    logError(error) {
        const errorGroup = `%c[${error.type.toUpperCase()}]`;
        const errorStyle = this.getErrorStyle(error.type);

        console.group(errorGroup, errorStyle);
        this._log('error', 'Message:', error.message);

        if (error.filename) {
            this._log('error', 'Fichier:', error.filename);
        }

        if (error.line && error.column) {
            this._log('error', 'Position:', `${error.line}:${error.column}`);
        }

        if (error.stack) {
            this._log('error', 'Stack trace:');
            this._log('error', error.stack);
        }

        this._log('error', 'Timestamp:', error.timestamp);
        console.groupEnd();
    }

    // Styles pour les logs
    getErrorStyle(type) {
        const styles = {
            javascript: 'color: #D32F2F; font-weight: bold;',
            promise: 'color: #FF6F00; font-weight: bold;',
            resource: 'color: #1976D2; font-weight: bold;',
            network: 'color: #7B1FA2; font-weight: bold;',
            validation: 'color: #388E3C; font-weight: bold;',
            database: 'color: #F57C00; font-weight: bold;'
        };
        return styles[type] || 'color: #666; font-weight: bold;';
    }

    // Afficher notification d'erreur
    showErrorNotification(error) {
        const message = this.getUserFriendlyMessage(error);
        const type = this.getNotificationType(error.type);

        if (window.Utils) {
            Utils.showNotification(message, type);
        } else {
            // Fallback si Utils n'est pas disponible
            alert(message);
        }
    }

    // Messages conviviaux pour l'utilisateur
    getUserFriendlyMessage(error) {
        const messages = {
            javascript: 'Une erreur technique est survenue',
            promise: 'Erreur lors du traitement des données',
            resource: 'Erreur de chargement d\'une ressource',
            network: 'Problème de connexion réseau',
            validation: 'Données invalides détectées',
            database: 'Erreur d\'accès aux données'
        };

        return messages[error.type] || 'Une erreur inattendue s\'est produite';
    }

    // Type de notification selon l'erreur
    getNotificationType(errorType) {
        const types = {
            javascript: 'danger',
            promise: 'danger',
            resource: 'warning',
            network: 'warning',
            validation: 'warning',
            database: 'danger'
        };

        return types[errorType] || 'danger';
    }

    // Envoyer erreur au serveur
    async sendErrorToServer(error) {
        try {
            // Dans un environnement réel, on enverrait à un service de monitoring
            // comme Sentry, LogRocket, etc.

            const errorData = {
                ...error,
                userAgent: navigator.userAgent,
                url: window.location.href,
                userId: this.getCurrentUserId(),
                sessionId: this.getSessionId()
            };

            // Simulation d'envoi au serveur (désactivé pour éviter spam console)
            // this._log('debug','Envoi erreur au serveur:', errorData);

            // Dans un vrai projet :
            // await fetch('/api/errors', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(errorData)
            // });

        } catch (sendError) {
            this._log('warn','Impossible d\'envoyer l\'erreur au serveur:', sendError);
            this.storeErrorForLater(error);
        }
    }

    // Stocker erreur pour envoi ultérieur
    storeErrorForLater(error) {
        try {
            const pendingErrors = JSON.parse(localStorage.getItem('pendingErrors') || '[]');
            pendingErrors.push(error);

            // Limiter le nombre d'erreurs en attente
            if (pendingErrors.length > 50) {
                pendingErrors.splice(0, pendingErrors.length - 50);
            }

            localStorage.setItem('pendingErrors', JSON.stringify(pendingErrors));
        } catch (storageError) {
            this._log('warn','Impossible de stocker l\'erreur:', storageError);
        }
    }

    // Synchroniser les erreurs en attente
    async syncPendingErrors() {
        try {
            const pendingErrors = JSON.parse(localStorage.getItem('pendingErrors') || '[]');

            if (pendingErrors.length > 0) {
                this._log('debug','Synchronisation de', pendingErrors.length, 'erreurs en attente');

                for (const error of pendingErrors) {
                    await this.sendErrorToServer(error);
                }

                // Nettoyer les erreurs synchronisées
                localStorage.removeItem('pendingErrors');
                this._log('debug','Erreurs synchronisées avec succès');
            }

        } catch (syncError) {
            this._log('warn','Erreur lors de la synchronisation:', syncError);
        }
    }

    // Utilitaires
    getCurrentUserId() {
        // Récupérer l'ID de l'utilisateur actuel
        return localStorage.getItem('currentUserId') || 'anonymous';
    }

    getSessionId() {
        // Générer ou récupérer l'ID de session
        let sessionId = sessionStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('sessionId', sessionId);
        }
        return sessionId;
    }

    // Créer une erreur personnalisée
    createError(type, message, details = {}) {
        const error = {
            type,
            message,
            timestamp: new Date().toISOString(),
            ...details
        };

        this.handleError(error);
        return error;
    }

    // Wrapper pour les erreurs de validation
    validationError(field, message, value = null) {
        return this.createError('validation', message, {
            field,
            value,
            context: 'form_validation'
        });
    }

    // Wrapper pour les erreurs réseau
    networkError(url, status, message) {
        return this.createError('network', message, {
            url,
            status,
            context: 'network_request'
        });
    }

    // Wrapper pour les erreurs de base de données
    databaseError(operation, message, details = {}) {
        return this.createError('database', message, {
            operation,
            context: 'database_operation',
            ...details
        });
    }

    // Obtenir les statistiques d'erreurs
    getErrorStats() {
        const stats = {
            total: this.errors.length,
            byType: {},
            recent: this.errors.slice(0, 10)
        };

        // Comptage par type
        this.errors.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        });

        return stats;
    }

    // Nettoyer les erreurs anciennes
    cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 heures par défaut
        const cutoff = Date.now() - maxAge;

        this.errors = this.errors.filter(error => {
            const errorTime = new Date(error.timestamp).getTime();
            return errorTime > cutoff;
        });

        this._log('debug','Nettoyage des erreurs terminé');
    }

    // Afficher notification personnalisée
    showNotification(message, type = 'info') {
        // Créer l'élément de notification
        const notification = document.createElement('div');
        notification.className = `error-notification error-${type}`;
        notification.innerHTML = `
            <div class="error-content">
                <span class="error-icon">${this.getNotificationIcon(type)}</span>
                <span class="error-message">${message}</span>
                <button class="error-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Styles intégrés
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            min-width: 300px;
            max-width: 500px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            font-size: 14px;
            animation: slideInRight 0.3s ease-out;
        `;

        // Couleurs selon le type
        const colors = {
            success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
            warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' },
            danger: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
            info: { bg: '#cce7ff', border: '#b3d7ff', text: '#004085' }
        };

        const color = colors[type] || colors.info;
        notification.style.backgroundColor = color.bg;
        notification.style.borderLeft = `4px solid ${color.border}`;
        notification.style.color = color.text;

        // Ajouter au DOM
        document.body.appendChild(notification);

        // Suppression automatique
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    // Icônes pour les notifications
    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            warning: '⚠️',
            danger: '❌',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }
}

// Ajouter les styles CSS pour les animations
const errorStyles = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .error-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .error-icon {
        font-size: 18px;
        min-width: 20px;
    }

    .error-message {
        flex: 1;
        line-height: 1.4;
    }

    .error-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.7;
        padding: 0;
        margin: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .error-close:hover {
        opacity: 1;
    }
`;

// Ajouter les styles au document
const errorStyleSheet = document.createElement('style');
errorStyleSheet.textContent = errorStyles;
document.head.appendChild(errorStyleSheet);

// Créer l'instance globale
window.ErrorHandler = new ErrorHandler();

// Export pour les modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}