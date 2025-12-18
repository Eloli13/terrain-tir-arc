// Gestionnaire de base de données avec support API et fallback localStorage
class DatabaseManager {
    static DB_NAME = 'tirArcDB';
    static VERSION = 1;
    // Configuration de l'URL de l'API
    // Développement local: port 80 (Docker avec Nginx)
    // Production (Coolify): port 3000 via reverse proxy
    static API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost/api'  // Local: port 80
        : window.location.hostname.includes('hstgr.cloud')
            ? `${window.location.protocol}//${window.location.hostname}:3000/api`  // Production Coolify: port 3000
            : '/api';  // Autre: utiliser le même domaine

    static authToken = null;
    static useAPI = null; // null = pas encore testé, true = API disponible, false = localStorage uniquement
    static apiCheckPromise = null; // Promise pour éviter les appels simultanés

    // ========================================
    // GESTION DE L'AUTHENTIFICATION
    // ========================================

    static setAuthToken(token) {
        this.authToken = token;
        if (token) {
            localStorage.setItem('auth_token', token);
        } else {
            localStorage.removeItem('auth_token');
        }
    }

    static getAuthToken() {
        if (!this.authToken) {
            this.authToken = localStorage.getItem('auth_token');
        }
        return this.authToken;
    }

    static async login(username, password) {
        try {
            const response = await fetch(`${this.API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                // Gestion spéciale pour le rate limiting (429)
                if (response.status === 429) {
                    // Essayer d'extraire le temps restant depuis les headers
                    const retryAfter = response.headers.get('Retry-After');
                    const rateLimitReset = response.headers.get('X-RateLimit-Reset');

                    let waitTime = 900; // 15 minutes par défaut (en secondes)

                    if (retryAfter) {
                        // Retry-After peut être en secondes ou une date
                        const retrySeconds = parseInt(retryAfter);
                        if (!isNaN(retrySeconds)) {
                            waitTime = retrySeconds;
                        }
                    } else if (rateLimitReset) {
                        // X-RateLimit-Reset est généralement un timestamp Unix
                        const resetTime = parseInt(rateLimitReset);
                        if (!isNaN(resetTime)) {
                            const now = Math.floor(Date.now() / 1000);
                            waitTime = Math.max(0, resetTime - now);
                        }
                    }

                    const error = new Error('RATE_LIMIT_EXCEEDED');
                    error.waitTime = waitTime;
                    error.status = 429;
                    throw error;
                }

                const error = await response.json();
                throw new Error(error.message || 'Échec de la connexion');
            }

            const data = await response.json();
            this.setAuthToken(data.accessToken);

            // Stocker le refresh token
            if (data.refreshToken) {
                localStorage.setItem('refresh_token', data.refreshToken);
            }

            return data;
        } catch (error) {
            Logger.error('Erreur de connexion:', error);
            throw error;
        }
    }

    static async logout() {
        try {
            const token = this.getAuthToken();
            if (token) {
                await fetch(`${this.API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            Logger.error('Erreur lors de la déconnexion:', error);
        } finally {
            this.setAuthToken(null);
            localStorage.removeItem('refresh_token');
        }
    }

    static async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                throw new Error('Pas de refresh token disponible');
            }

            const response = await fetch(`${this.API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new Error('Échec du renouvellement du token');
            }

            const data = await response.json();
            this.setAuthToken(data.accessToken);
            return data.accessToken;
        } catch (error) {
            Logger.error('Erreur de rafraîchissement du token:', error);
            // Forcer la déconnexion si le refresh échoue
            await this.logout();
            throw error;
        }
    }

    // ========================================
    // REQUÊTES API AVEC GESTION D'ERREURS
    // ========================================

    static async apiRequest(endpoint, options = {}) {
        const url = `${this.API_BASE_URL}${endpoint}`;
        const token = this.getAuthToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token && !options.noAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            // Si 401 (non autorisé), tenter de rafraîchir le token (seulement si on avait un token)
            if (response.status === 401 && !options.noRetry && token) {
                try {
                    await this.refreshToken();
                    // Réessayer la requête avec le nouveau token
                    return await this.apiRequest(endpoint, { ...options, noRetry: true });
                } catch (refreshError) {
                    throw new Error('Session expirée, veuillez vous reconnecter');
                }
            }

            // Si 401 sans token, c'est une route protégée appelée sans authentification
            // On retourne null pour basculer sur localStorage
            if (response.status === 401 && !token) {
                Logger.warn(`Route ${endpoint} nécessite une authentification, fallback localStorage`);
                return null;
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `Erreur HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            Logger.error(`Erreur API ${endpoint}:`, error);

            // Si l'API est indisponible, basculer sur localStorage
            if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
                Logger.warn('API indisponible, utilisation du stockage local');
                this.useAPI = false;
                return null;
            }

            throw error;
        }
    }

    // ========================================
    // FALLBACK LOCALSTORAGE
    // ========================================
    // Note: Le localStorage est utilisé uniquement comme fallback
    // pour les sessions/incidents en cas d'API indisponible.
    // L'authentification se fait TOUJOURS via l'API backend.

    static async init() {
        // Si une vérification est déjà en cours, attendre son résultat
        if (this.apiCheckPromise) {
            await this.apiCheckPromise;
            return;
        }

        // Vérifier si l'API est disponible (seulement si pas déjà testé)
        if (this.useAPI === undefined || this.useAPI === null) {
            // Créer une Promise pour que les autres appels puissent attendre
            this.apiCheckPromise = this.checkAPIAvailability();
            await this.apiCheckPromise;
            this.apiCheckPromise = null; // Réinitialiser après la vérification
        }

        // Initialiser localStorage comme fallback (SANS mot de passe admin)
        if (!localStorage.getItem(this.DB_NAME)) {
            const defaultData = {
                sessions: [],
                incidents: [],
                configuration: {
                    telephone_responsable: '0123456789',
                    email_incidents: 'incidents@club-tir-arc.fr',
                    qr_code_data: 'TERRAIN_TIR_ARC_ACCESS'
                    // ⚠️ SÉCURITÉ: Le mot de passe admin n'est JAMAIS stocké côté client
                    // L'authentification se fait uniquement via l'API backend
                }
            };
            localStorage.setItem(this.DB_NAME, JSON.stringify(defaultData));
            Logger.debug('✅ localStorage initialisé (sans données sensibles)');
        } else {
            // Nettoyer les anciennes données sensibles si elles existent
            await this.cleanupSensitiveLocalData();
        }
    }

    /**
     * Vérifie si l'API est disponible (méthode séparée pour éviter les appels simultanés)
     */
    static async checkAPIAvailability() {
        try {
            const healthUrl = `${this.API_BASE_URL.replace('/api', '')}/health`;
            Logger.debug('🔍 Test de l\'API:', healthUrl);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                Logger.warn('⏱️ Timeout du test API (15s)');
                controller.abort();
            }, 15000); // 15 secondes (augmenté de 10 à 15)

            const startTime = Date.now();
            const response = await fetch(healthUrl, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-cache', // Éviter le cache
                headers: {
                    'Accept': 'application/json'
                }
            });

            const responseTime = Date.now() - startTime;
            clearTimeout(timeoutId);

            this.useAPI = response.ok;
            Logger.debug(`✅ API ${response.ok ? 'disponible' : 'erreur'}: Status ${response.status} (${responseTime}ms)`);
        } catch (error) {
            Logger.error('❌ Erreur test API:', error.message, error.name);
            if (error.name === 'AbortError') {
                Logger.warn('⚠️ Le serveur ne répond pas assez vite. Utilisez "mode localStorage" ou vérifiez que le serveur tourne bien.');
            }
            Logger.warn('API non disponible, mode localStorage activé');
            this.useAPI = false;
        }
    }

    /**
     * Nettoie les données sensibles du localStorage (migration de sécurité)
     */
    static async cleanupSensitiveLocalData() {
        const data = this.getLocalData();
        if (!data) return;

        let needsUpdate = false;

        // Supprimer le mot de passe admin s'il existe
        if (data.configuration && data.configuration.admin_password) {
            delete data.configuration.admin_password;
            needsUpdate = true;
            Logger.warn('🔒 Mot de passe admin supprimé du localStorage (sécurité)');
        }

        // Sauvegarder si modifié
        if (needsUpdate) {
            this.saveLocalData(data);
            Logger.debug('✅ Données sensibles nettoyées');
        }
    }

    static getLocalData() {
        const data = localStorage.getItem(this.DB_NAME);
        return data ? JSON.parse(data) : null;
    }

    static saveLocalData(data) {
        localStorage.setItem(this.DB_NAME, JSON.stringify(data));
    }

    // ========================================
    // SESSIONS - Avec support API
    // ========================================

    static async createSession(sessionData) {
        try {
            // Validation des données
            if (!this.validateSessionData(sessionData)) {
                throw new Error('Données de session invalides');
            }

            // Tenter l'API d'abord
            if (this.useAPI) {
                try {
                    const session = await this.apiRequest('/sessions', {
                        method: 'POST',
                        body: JSON.stringify(sessionData),
                        noAuth: true // Les sessions publiques ne nécessitent pas d'auth
                    });

                    if (session) {
                        Logger.debug('Session créée via API:', session.id);
                        return session;
                    }
                } catch (apiError) {
                    Logger.warn('Échec API, fallback localStorage:', apiError);
                }
            }

            // Fallback localStorage
            await this.init();
            const data = this.getLocalData();
            if (!data) {
                throw new Error('Impossible de récupérer les données');
            }

            const session = {
                id: Date.now(),
                nom: sessionData.nom?.trim(),
                prenom: sessionData.prenom?.trim(),
                type_tireur: sessionData.type_tireur,
                nombre_tireurs: parseInt(sessionData.nombre_tireurs),
                terrain: sessionData.terrain,
                date_debut: new Date().toISOString(),
                date_fin: null,
                active: true
            };

            data.sessions.push(session);
            this.saveLocalData(data);
            Logger.debug('Session créée en local:', session.id);
            return session;

        } catch (error) {
            if (window.ErrorHandler) {
                window.ErrorHandler.databaseError('createSession', 'Erreur lors de la création de session', {
                    sessionData: sessionData,
                    error: error.message
                });
            }
            throw new Error(`Impossible de créer la session: ${error.message}`);
        }
    }

    static validateSessionData(sessionData) {
        if (!sessionData) return false;

        const required = ['nom', 'prenom', 'type_tireur', 'nombre_tireurs', 'terrain'];
        for (const field of required) {
            if (!sessionData[field] || (typeof sessionData[field] === 'string' && !sessionData[field].trim())) {
                if (window.ErrorHandler) {
                    window.ErrorHandler.validationError(field, `Le champ ${field} est obligatoire`);
                }
                return false;
            }
        }

        if (isNaN(sessionData.nombre_tireurs) || sessionData.nombre_tireurs < 1) {
            if (window.ErrorHandler) {
                window.ErrorHandler.validationError('nombre_tireurs', 'Le nombre de tireurs doit être supérieur à 0');
            }
            return false;
        }

        if (!['interieur', 'exterieur'].includes(sessionData.terrain)) {
            if (window.ErrorHandler) {
                window.ErrorHandler.validationError('terrain', 'Terrain invalide');
            }
            return false;
        }

        return true;
    }

    static async endSession(sessionId) {
        try {
            // Tenter l'API
            if (this.useAPI) {
                try {
                    const session = await this.apiRequest(`/sessions/${sessionId}`, {
                        method: 'PUT',
                        body: JSON.stringify({ active: false }),
                        noAuth: true
                    });

                    if (session) {
                        Logger.debug('Session terminée via API:', sessionId);
                        return session;
                    }
                } catch (apiError) {
                    Logger.warn('Échec API, fallback localStorage:', apiError);
                }
            }

            // Fallback localStorage
            const data = this.getLocalData();
            if (!data) {
                throw new Error('Impossible de récupérer les données');
            }

            const sessionIndex = data.sessions.findIndex(s => s.id === sessionId);
            if (sessionIndex === -1) {
                throw new Error('Session non trouvée');
            }

            if (!data.sessions[sessionIndex].active) {
                throw new Error('Session déjà terminée');
            }

            data.sessions[sessionIndex].active = false;
            data.sessions[sessionIndex].date_fin = new Date().toISOString();
            this.saveLocalData(data);

            Logger.debug('Session terminée en local:', sessionId);
            return data.sessions[sessionIndex];

        } catch (error) {
            if (window.ErrorHandler) {
                window.ErrorHandler.databaseError('endSession', 'Erreur lors de la fermeture de session', {
                    sessionId: sessionId,
                    error: error.message
                });
            }
            throw new Error(`Impossible de terminer la session: ${error.message}`);
        }
    }

    static async getActiveSessions() {
        await this.init();

        // Tenter l'API
        if (this.useAPI) {
            try {
                const response = await this.apiRequest('/sessions/active', {
                    method: 'GET',
                    noAuth: true
                });
                if (response && response.sessions) return response.sessions;
            } catch (error) {
                Logger.warn('Échec récupération sessions actives API:', error);
            }
        }

        // Fallback localStorage
        const data = this.getLocalData();
        return data.sessions.filter(s => s.active);
    }

    static async getCurrentStats() {
        const duplicatesRemoved = await this.cleanupDuplicateSessions();
        if (duplicatesRemoved > 0) {
            Logger.debug(`${duplicatesRemoved} session(s) en double supprimée(s)`);
        }

        // Tenter l'API pour les stats
        if (this.useAPI) {
            try {
                const response = await this.apiRequest('/sessions/stats', {
                    method: 'GET',
                    noAuth: true
                });
                if (response && response.active) {
                    // Transformer la réponse API au format attendu
                    return {
                        interieur: response.active.interieur?.tireurs || 0,
                        exterieur: response.active.exterieur?.tireurs || 0
                    };
                }
            } catch (error) {
                Logger.warn('Échec récupération stats API:', error);
            }
        }

        // Fallback localStorage
        const activeSessions = await this.getActiveSessions();
        const stats = {
            interieur: 0,
            exterieur: 0
        };

        activeSessions.forEach(session => {
            if (session.terrain === 'interieur') {
                stats.interieur += session.nombre_tireurs;
            } else if (session.terrain === 'exterieur') {
                stats.exterieur += session.nombre_tireurs;
            }
        });

        return stats;
    }

    static async getAllSessions(filters = {}) {
        await this.init();

        // Tenter l'API
        if (this.useAPI) {
            try {
                const params = new URLSearchParams(filters);
                const response = await this.apiRequest(`/sessions?${params}`);
                if (response && response.sessions) return response.sessions;
            } catch (error) {
                Logger.warn('Échec récupération sessions API:', error);
            }
        }

        // Fallback localStorage
        const data = this.getLocalData();
        let sessions = [...data.sessions];

        if (filters.dateDebut) {
            sessions = sessions.filter(s => s.date_debut >= filters.dateDebut);
        }
        if (filters.dateFin) {
            sessions = sessions.filter(s => s.date_debut <= filters.dateFin);
        }
        if (filters.terrain) {
            sessions = sessions.filter(s => s.terrain === filters.terrain);
        }
        if (filters.type_tireur) {
            sessions = sessions.filter(s => s.type_tireur === filters.type_tireur);
        }

        sessions.sort((a, b) => new Date(b.date_debut) - new Date(a.date_debut));
        return sessions;
    }

    // ========================================
    // INCIDENTS - Avec support API
    // ========================================

    static async createIncident(incidentData) {
        await this.init();

        // Tenter l'API
        if (this.useAPI) {
            try {
                const incident = await this.apiRequest('/incidents', {
                    method: 'POST',
                    body: JSON.stringify(incidentData),
                    noAuth: true
                });

                if (incident) {
                    Logger.debug('Incident créé via API:', incident.id);
                    return incident;
                }
            } catch (error) {
                Logger.warn('Échec création incident API:', error);
            }
        }

        // Fallback localStorage
        const data = this.getLocalData();
        const incident = {
            id: Date.now(),
            type_incident: incidentData.type_incident,
            description: incidentData.description,
            photo_path: incidentData.photo_path || null,
            terrain: incidentData.terrain,
            date_incident: new Date().toISOString(),
            statut: 'en_attente',
            resolution_notes: null,
            date_resolution: null
        };

        data.incidents.push(incident);
        this.saveLocalData(data);
        await this.sendIncidentEmail(incident);
        return incident;
    }

    static async updateIncident(incidentId, updates) {
        // Tenter l'API
        if (this.useAPI) {
            try {
                const incident = await this.apiRequest(`/incidents/${incidentId}`, {
                    method: 'PUT',
                    body: JSON.stringify(updates)
                });
                if (incident) return incident;
            } catch (error) {
                Logger.warn('Échec mise à jour incident API:', error);
            }
        }

        // Fallback localStorage
        const data = this.getLocalData();
        const incidentIndex = data.incidents.findIndex(i => i.id === incidentId);

        if (incidentIndex !== -1) {
            Object.assign(data.incidents[incidentIndex], updates);
            if (updates.statut === 'resolu' && !data.incidents[incidentIndex].date_resolution) {
                data.incidents[incidentIndex].date_resolution = new Date().toISOString();
            }
            this.saveLocalData(data);
            return data.incidents[incidentIndex];
        }

        throw new Error('Incident non trouvé');
    }

    static async deleteIncident(incidentId) {
        await this.init();

        // Tenter l'API
        if (this.useAPI) {
            try {
                await this.apiRequest(`/incidents/${incidentId}`, {
                    method: 'DELETE'
                });
                return true;
            } catch (error) {
                Logger.warn('Échec suppression incident API:', error);
            }
        }

        // Fallback localStorage
        const data = this.getLocalData();
        const incidentIndex = data.incidents.findIndex(i => i.id === incidentId);
        if (incidentIndex === -1) {
            throw new Error('Incident non trouvé');
        }

        data.incidents.splice(incidentIndex, 1);
        this.saveLocalData(data);
        Logger.debug('Incident supprimé:', incidentId);
        return true;
    }

    static async getAllIncidents(filters = {}) {
        await this.init();

        // Tenter l'API
        if (this.useAPI) {
            try {
                const params = new URLSearchParams(filters);
                const response = await this.apiRequest(`/incidents?${params}`);
                if (response && response.incidents) return response.incidents;
            } catch (error) {
                Logger.warn('Échec récupération incidents API:', error);
            }
        }

        // Fallback localStorage
        const data = this.getLocalData();
        let incidents = [...data.incidents];

        if (filters.statut) {
            incidents = incidents.filter(i => i.statut === filters.statut);
        }
        if (filters.terrain) {
            incidents = incidents.filter(i => i.terrain === filters.terrain);
        }
        if (filters.dateDebut) {
            incidents = incidents.filter(i => i.date_incident >= filters.dateDebut);
        }
        if (filters.dateFin) {
            incidents = incidents.filter(i => i.date_incident <= filters.dateFin);
        }

        incidents.sort((a, b) => new Date(b.date_incident) - new Date(a.date_incident));
        return incidents;
    }

    // ========================================
    // CONFIGURATION
    // ========================================

    static async getConfiguration() {
        await this.init();

        // Tenter l'API
        if (this.useAPI) {
            try {
                const response = await this.apiRequest('/config');
                if (response && response.configuration) {
                    // Normaliser le format de l'API pour extraire les valeurs
                    const config = {};
                    for (const [key, data] of Object.entries(response.configuration)) {
                        config[key] = data.value || data;
                    }
                    return config;
                }
            } catch (error) {
                Logger.warn('Échec récupération config API:', error);
            }
        }

        // Fallback localStorage
        const data = this.getLocalData();
        return data.configuration;
    }

    static async updateConfiguration(key, value, description = '') {
        // Tenter l'API (uniquement si authentifié)
        if (this.useAPI && this.getAuthToken()) {
            try {
                // Format attendu par l'API: { key, value, description }
                const config = await this.apiRequest('/config', {
                    method: 'PUT',
                    body: JSON.stringify({
                        key: key,
                        value: String(value),
                        description: description
                    })
                });
                if (config) {
                    Logger.debug(`✅ Configuration '${key}' mise à jour via API`);
                    return config;
                }
            } catch (error) {
                Logger.warn(`⚠️ Échec mise à jour config API pour '${key}':`, error.message);
                // Continuer avec localStorage en fallback
            }
        }

        // Fallback localStorage (si pas d'API ou pas authentifié)
        const data = this.getLocalData();
        data.configuration[key] = value;
        this.saveLocalData(data);
        return data.configuration;
    }

    // ========================================
    // STATISTIQUES ET UTILITAIRES (inchangés)
    // ========================================

    static async getFrequentationStats(periode = 'month') {
        const sessions = await this.getAllSessions();
        const now = new Date();
        let startDate;

        switch (periode) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0);
        }

        const filteredSessions = sessions.filter(s =>
            new Date(s.date_debut) >= startDate
        );

        const groupedData = {};
        filteredSessions.forEach(session => {
            const date = new Date(session.date_debut).toISOString().split('T')[0];
            if (!groupedData[date]) {
                groupedData[date] = {
                    date,
                    interieur: 0,
                    exterieur: 0,
                    total: 0,
                    sessions: 0
                };
            }

            groupedData[date][session.terrain] += session.nombre_tireurs;
            groupedData[date].total += session.nombre_tireurs;
            groupedData[date].sessions += 1;
        });

        return Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
    }

    static async sendIncidentEmail(incident) {
        const config = await this.getConfiguration();
        const emailData = {
            to: config.email_incidents,
            subject: `[INCIDENT] ${incident.type_incident} - ${incident.terrain}`,
            body: `
                NOUVEAU SIGNALEMENT D'INCIDENT

                Type d'incident: ${incident.type_incident}
                Terrain: ${incident.terrain}
                Date: ${new Date(incident.date_incident).toLocaleString('fr-FR')}

                Description:
                ${incident.description}

                ${incident.photo_path ? `Photo jointe: ${incident.photo_path}` : 'Aucune photo jointe'}

                ---
                Signalement automatique du système de gestion des terrains de tir à l'arc
            `
        };

        Logger.debug('Email envoyé:', emailData);
        return true;
    }

    static async exportSessions(format = 'csv') {
        const sessions = await this.getAllSessions();

        if (format === 'csv') {
            const headers = ['ID', 'Nom', 'Prénom', 'Type Tireur', 'Nombre Tireurs', 'Terrain', 'Date Début', 'Date Fin', 'Durée'];
            const csvContent = [
                headers.join(','),
                ...sessions.map(session => [
                    session.id,
                    session.nom,
                    session.prenom,
                    session.type_tireur,
                    session.nombre_tireurs,
                    session.terrain,
                    new Date(session.date_debut).toLocaleString('fr-FR'),
                    session.date_fin ? new Date(session.date_fin).toLocaleString('fr-FR') : 'En cours',
                    session.date_fin ? this.calculateDuration(session.date_debut, session.date_fin) : ''
                ].join(','))
            ].join('\n');

            return csvContent;
        }

        if (format === 'json') {
            return JSON.stringify(sessions, null, 2);
        }

        if (format === 'xls' || format === 'xlsx') {
            const excelData = sessions.map(session => ({
                'ID': session.id,
                'Nom': session.nom,
                'Prénom': session.prenom,
                'Type Tireur': session.type_tireur,
                'Nombre Tireurs': session.nombre_tireurs,
                'Terrain': session.terrain,
                'Date Début': new Date(session.date_debut).toLocaleString('fr-FR'),
                'Date Fin': session.date_fin ? new Date(session.date_fin).toLocaleString('fr-FR') : 'En cours',
                'Durée': session.date_fin ? this.calculateDuration(session.date_debut, session.date_fin) : ''
            }));

            return excelData;
        }

        throw new Error('Format non supporté');
    }

    static calculateDuration(start, end) {
        const duration = new Date(end) - new Date(start);
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h${minutes}min`;
    }

    static downloadFile(content, filename, contentType = 'text/plain') {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    static async cleanupDuplicateSessions() {
        await this.init();
        const data = this.getLocalData();

        const activeSessions = data.sessions.filter(s => s.active);
        const duplicates = [];

        for (let i = 0; i < activeSessions.length; i++) {
            for (let j = i + 1; j < activeSessions.length; j++) {
                const session1 = activeSessions[i];
                const session2 = activeSessions[j];

                if (session1.nom === session2.nom &&
                    session1.prenom === session2.prenom &&
                    session1.terrain === session2.terrain) {

                    const older = new Date(session1.date_debut) < new Date(session2.date_debut) ? session1 : session2;
                    if (!duplicates.find(d => d.id === older.id)) {
                        duplicates.push(older);
                    }
                }
            }
        }

        if (duplicates.length > 0) {
            Logger.debug('Sessions en double trouvées:', duplicates);

            duplicates.forEach(duplicate => {
                const sessionIndex = data.sessions.findIndex(s => s.id === duplicate.id);
                if (sessionIndex !== -1) {
                    data.sessions[sessionIndex].active = false;
                    data.sessions[sessionIndex].date_fin = new Date().toISOString();
                    Logger.debug(`Session duplicate ${duplicate.id} fermée automatiquement`);
                }
            });

            this.saveLocalData(data);
            return duplicates.length;
        }

        return 0;
    }
}

// Initialiser la base de données au chargement
document.addEventListener('DOMContentLoaded', () => {
    DatabaseManager.init();
});
