/**
 * Middleware pour l'audit logging automatique
 * Évite la duplication de code dans les routes
 */

const database = require('../config/database');
const logger = require('../utils/logger');

/**
 * Créer un middleware d'audit pour une action spécifique
 *
 * @param {string} action - Type d'action (CREATE, UPDATE, DELETE, etc.)
 * @param {string} resource - Type de ressource (INCIDENT, SESSION, CONFIG, etc.)
 * @param {Object} options - Options additionnelles
 * @param {Function} options.getResourceId - Fonction pour extraire l'ID de la ressource
 * @param {Function} options.getOldValues - Fonction pour extraire les anciennes valeurs (UPDATE/DELETE)
 * @param {Function} options.getNewValues - Fonction pour extraire les nouvelles valeurs (CREATE/UPDATE)
 * @param {boolean} options.skipIfNoUser - Ne pas logger si pas d'utilisateur authentifié
 *
 * @returns {Function} Middleware Express
 */
function auditLog(action, resource, options = {}) {
    const {
        getResourceId = null,
        getOldValues = null,
        getNewValues = null,
        skipIfNoUser = false
    } = options;

    return async (req, res, next) => {
        // Stocker les données originales pour UPDATE/DELETE
        if (getOldValues) {
            try {
                req.auditOldValues = await getOldValues(req);
            } catch (error) {
                logger.error('Erreur lors de la récupération des anciennes valeurs pour audit:', error);
            }
        }

        // Intercepter la réponse pour logger après succès
        const originalJson = res.json.bind(res);
        res.json = function (data) {
            // Logger uniquement si la réponse est un succès (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Exécuter le logging en arrière-plan
                logAudit(req, res, data, action, resource, {
                    getResourceId,
                    getNewValues,
                    skipIfNoUser
                }).catch(error => {
                    logger.error('Erreur lors de l\'audit logging:', error);
                });
            }

            return originalJson(data);
        };

        next();
    };
}

/**
 * Logger l'action dans la table audit_logs
 */
async function logAudit(req, res, responseData, action, resource, options) {
    const { getResourceId, getNewValues, skipIfNoUser } = options;

    // Vérifier si utilisateur authentifié
    if (!req.user) {
        if (skipIfNoUser) {
            return; // Ne pas logger si pas d'utilisateur et skipIfNoUser=true
        }
        // Sinon, logger avec userId = null pour actions publiques
    }

    const userId = req.user ? req.user.id : null;

    try {
        // Extraire l'ID de la ressource
        let resourceId = null;
        if (getResourceId) {
            resourceId = await getResourceId(req, responseData);
        } else {
            // Par défaut, essayer req.params.id ou responseData.id
            resourceId = req.params.id || responseData?.id || responseData?.incident?.id || responseData?.session?.id || null;
        }

        // Extraire les nouvelles valeurs
        let newValues = null;
        if (getNewValues) {
            newValues = await getNewValues(req, responseData);
        } else if (action === 'CREATE' || action === 'UPDATE') {
            // Par défaut, utiliser req.body (sans champs sensibles)
            newValues = sanitizeAuditData(req.body);
        }

        // Extraire les anciennes valeurs (pour UPDATE/DELETE)
        const oldValues = req.auditOldValues ? sanitizeAuditData(req.auditOldValues) : null;

        // Insérer dans audit_logs
        await database.query(`
            INSERT INTO audit_logs (
                user_id,
                action,
                resource,
                resource_id,
                old_values,
                new_values,
                ip_address,
                user_agent
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
            userId,
            action,
            resource,
            resourceId,
            oldValues ? JSON.stringify(oldValues) : null,
            newValues ? JSON.stringify(newValues) : null,
            req.ip,
            req.get('User-Agent')
        ]);

        logger.debug('Audit log enregistré', {
            userId,
            action,
            resource,
            resourceId
        });

    } catch (error) {
        // Ne pas faire échouer la requête si l'audit échoue
        logger.error('Impossible d\'enregistrer l\'audit log:', error);
    }
}

/**
 * Nettoyer les données sensibles avant logging
 */
function sanitizeAuditData(data) {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const sanitized = { ...data };

    // Liste des champs sensibles à masquer
    const sensitiveFields = [
        'password',
        'password_hash',
        'salt',
        'smtp_password',
        'token',
        'refreshToken',
        'accessToken',
        'secret',
        'apiKey'
    ];

    // Masquer les champs sensibles
    for (const field of sensitiveFields) {
        if (field in sanitized) {
            sanitized[field] = '***MASQUÉ***';
        }
    }

    // Masquer partiellement les emails
    if (sanitized.email && typeof sanitized.email === 'string') {
        sanitized.email = maskEmail(sanitized.email);
    }
    if (sanitized.smtp_user && typeof sanitized.smtp_user === 'string') {
        sanitized.smtp_user = maskEmail(sanitized.smtp_user);
    }
    if (sanitized.test_recipient && typeof sanitized.test_recipient === 'string') {
        sanitized.test_recipient = maskEmail(sanitized.test_recipient);
    }

    return sanitized;
}

/**
 * Masquer partiellement une adresse email
 * Exemple: john.doe@example.com → jo***@example.com
 */
function maskEmail(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        return email;
    }

    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
        return `**@${domain}`;
    }

    const visibleChars = Math.min(2, Math.floor(localPart.length / 3));
    const masked = localPart.substring(0, visibleChars) + '***';

    return `${masked}@${domain}`;
}

/**
 * Middleware pré-configurés pour actions courantes
 */
const auditMiddleware = {
    /**
     * Audit pour création d'incident
     */
    createIncident: auditLog('CREATE', 'INCIDENT', {
        getResourceId: (req, responseData) => responseData?.incident?.id || responseData?.id,
        getNewValues: (req) => ({
            type_incident: req.body.type_incident,
            description: req.body.description,
            terrain: req.body.terrain,
            photo_path: req.body.photo_path || req.file ? `/uploads/incidents/${req.file?.filename}` : null
        }),
        skipIfNoUser: false // Logger même si utilisateur non authentifié
    }),

    /**
     * Audit pour mise à jour d'incident
     */
    updateIncident: auditLog('UPDATE', 'INCIDENT', {
        getResourceId: (req) => req.params.id,
        getOldValues: async (req) => {
            const result = await database.query(
                'SELECT type_incident, description, terrain, statut FROM incidents WHERE id = $1',
                [req.params.id]
            );
            return result.rows[0];
        },
        getNewValues: (req) => req.body
    }),

    /**
     * Audit pour suppression d'incident
     */
    deleteIncident: auditLog('DELETE', 'INCIDENT', {
        getResourceId: (req) => req.params.id,
        getOldValues: async (req) => {
            const result = await database.query(
                'SELECT * FROM incidents WHERE id = $1',
                [req.params.id]
            );
            return result.rows[0];
        }
    }),

    /**
     * Audit pour création de session
     */
    createSession: auditLog('CREATE', 'SESSION', {
        getResourceId: (req, responseData) => responseData?.session?.id || responseData?.id,
        getNewValues: (req) => ({
            nom_tireur: req.body.nom_tireur,
            type_tireur: req.body.type_tireur,
            terrain: req.body.terrain,
            date_session: req.body.date_session
        })
    }),

    /**
     * Audit pour mise à jour de session
     */
    updateSession: auditLog('UPDATE', 'SESSION', {
        getResourceId: (req) => req.params.id,
        getOldValues: async (req) => {
            const result = await database.query(
                'SELECT nom_tireur, type_tireur, terrain, active FROM sessions WHERE id = $1',
                [req.params.id]
            );
            return result.rows[0];
        },
        getNewValues: (req) => req.body
    }),

    /**
     * Audit pour suppression de session
     */
    deleteSession: auditLog('DELETE', 'SESSION', {
        getResourceId: (req) => req.params.id,
        getOldValues: async (req) => {
            const result = await database.query(
                'SELECT * FROM sessions WHERE id = $1',
                [req.params.id]
            );
            return result.rows[0];
        }
    }),

    /**
     * Audit pour mise à jour de configuration
     */
    updateConfig: auditLog('UPDATE', 'CONFIGURATION', {
        getNewValues: (req) => req.body
    }),

    /**
     * Audit pour mise à jour configuration email
     */
    updateEmailConfig: auditLog('UPDATE', 'EMAIL_CONFIGURATION', {
        getNewValues: (req) => ({
            smtp_host: req.body.smtp_host,
            smtp_user: req.body.smtp_user,
            email_from: `${req.body.email_from_name || ''} <${req.body.email_from_address}>`,
            email_to: req.body.email_incidents_to,
            enabled: req.body.email_enabled
        })
    }),

    /**
     * Audit pour désactivation email
     */
    disableEmailConfig: auditLog('DISABLE', 'EMAIL_CONFIGURATION', {})
};

module.exports = {
    auditLog,
    auditMiddleware,
    sanitizeAuditData,
    maskEmail
};
