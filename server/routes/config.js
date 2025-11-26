const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const database = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

const router = express.Router();

/**
 * GET /api/config
 * Récupérer toute la configuration (accès public en lecture seule)
 */
router.get('/', async (req, res) => {
    try {
        const result = await database.query(`
            SELECT key, value, description, is_encrypted
            FROM configuration
            ORDER BY key
        `);

        // Déchiffrer les valeurs chiffrées si nécessaire
        const config = {};
        for (const row of result.rows) {
            if (row.is_encrypted) {
                // TODO: Implémenter le déchiffrement des valeurs sensibles
                // Pour l'instant, on ne retourne pas les valeurs chiffrées
                config[row.key] = {
                    value: '[ENCRYPTED]',
                    description: row.description,
                    encrypted: true
                };
            } else {
                config[row.key] = {
                    value: row.value,
                    description: row.description,
                    encrypted: false
                };
            }
        }

        res.json({ configuration: config });

    } catch (error) {
        logger.error('Erreur lors de la récupération de la configuration:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/config/:key
 * Récupérer une valeur de configuration spécifique
 */
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;

        const result = await database.query(`
            SELECT key, value, description, is_encrypted
            FROM configuration
            WHERE key = $1
        `, [key]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Clé de configuration non trouvée' });
        }

        const configItem = result.rows[0];

        if (configItem.is_encrypted) {
            // TODO: Implémenter le déchiffrement
            return res.json({
                key: configItem.key,
                value: '[ENCRYPTED]',
                description: configItem.description,
                encrypted: true
            });
        }

        res.json({
            key: configItem.key,
            value: configItem.value,
            description: configItem.description,
            encrypted: false
        });

    } catch (error) {
        logger.error('Erreur lors de la récupération de la configuration:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * PUT /api/config
 * Mettre à jour une valeur de configuration (authentification requise)
 */
router.put('/', requireAuth, validate(schemas.updateConfiguration), async (req, res) => {
    try {
        const { key, value, description } = req.body;

        // Vérifier si la clé existe déjà
        const existingResult = await database.query(`
            SELECT key, value, is_encrypted FROM configuration WHERE key = $1
        `, [key]);

        let oldValue = null;
        if (existingResult.rows.length > 0) {
            oldValue = existingResult.rows[0].value;
        }

        // Déterminer si la valeur doit être chiffrée (pour les données sensibles)
        const sensitiveKeys = [
            'admin_password',
            'jwt_secret',
            'database_password',
            'email_password',
            'api_key'
        ];

        const shouldEncrypt = sensitiveKeys.some(sensitiveKey =>
            key.toLowerCase().includes(sensitiveKey)
        );

        let finalValue = value;
        if (shouldEncrypt) {
            // TODO: Implémenter le chiffrement des valeurs sensibles
            // finalValue = encrypt(value);
            logger.security('Tentative de mise à jour d\'une configuration sensible', {
                key,
                userId: req.user.id,
                ip: req.ip
            });
        }

        const result = await database.transaction(async (client) => {
            // Insérer ou mettre à jour la configuration
            const configResult = await client.query(`
                INSERT INTO configuration (key, value, description, is_encrypted)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (key)
                DO UPDATE SET
                    value = EXCLUDED.value,
                    description = COALESCE(EXCLUDED.description, configuration.description),
                    is_encrypted = EXCLUDED.is_encrypted,
                    updated_at = NOW()
                RETURNING *
            `, [key, finalValue, description || null, shouldEncrypt]);

            // Enregistrer dans l'audit log
            // Note: resource_id est NULL car les configurations n'ont pas d'UUID
            // La clé de configuration est stockée dans old_values et new_values
            await client.query(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                req.user.id,
                existingResult.rows.length > 0 ? 'UPDATE' : 'CREATE',
                'CONFIGURATION',
                null, // resource_id est NULL pour les configurations (pas d'UUID)
                oldValue ? JSON.stringify({ key, value: oldValue }) : null,
                JSON.stringify({ key, value: shouldEncrypt ? '[ENCRYPTED]' : value }),
                req.ip,
                req.get('User-Agent')
            ]);

            return configResult.rows[0];
        });

        logger.info('Configuration mise à jour', {
            key,
            encrypted: shouldEncrypt,
            updatedBy: req.user.id
        });

        res.json({
            message: 'Configuration mise à jour avec succès',
            configuration: {
                key: result.key,
                value: shouldEncrypt ? '[ENCRYPTED]' : result.value,
                description: result.description,
                encrypted: result.is_encrypted
            }
        });

    } catch (error) {
        logger.error('Erreur lors de la mise à jour de la configuration:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * DELETE /api/config/:key
 * Supprimer une clé de configuration
 */
router.delete('/:key', async (req, res) => {
    try {
        const { key } = req.params;

        // Protéger certaines clés critiques contre la suppression
        const protectedKeys = [
            'telephone_responsable',
            'email_incidents',
            'qr_code_data',
            'max_sessions_per_terrain'
        ];

        if (protectedKeys.includes(key)) {
            return res.status(403).json({
                error: 'Cette clé de configuration ne peut pas être supprimée car elle est critique pour le fonctionnement de l\'application'
            });
        }

        const result = await database.transaction(async (client) => {
            // Récupérer la configuration avant suppression pour l'audit log
            const configResult = await client.query(`
                SELECT * FROM configuration WHERE key = $1
            `, [key]);

            if (configResult.rows.length === 0) {
                throw new Error('Clé de configuration non trouvée');
            }

            const configItem = configResult.rows[0];

            // Supprimer la configuration
            await client.query(`
                DELETE FROM configuration WHERE key = $1
            `, [key]);

            // Enregistrer dans l'audit log
            await client.query(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, old_values, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                req.user.id,
                'DELETE',
                'CONFIGURATION',
                key,
                JSON.stringify({
                    [key]: configItem.is_encrypted ? '[ENCRYPTED]' : configItem.value
                }),
                req.ip,
                req.get('User-Agent')
            ]);

            return configItem;
        });

        logger.info('Configuration supprimée', {
            key,
            deletedBy: req.user.id
        });

        logger.security('Configuration supprimée', {
            key,
            userId: req.user.id,
            ip: req.ip
        });

        res.json({ message: 'Configuration supprimée avec succès' });

    } catch (error) {
        if (error.message === 'Clé de configuration non trouvée') {
            return res.status(404).json({ error: error.message });
        }

        logger.error('Erreur lors de la suppression de la configuration:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/config/public/settings
 * Récupérer uniquement les paramètres de configuration publics (non sensibles)
 * Cette route peut être utilisée par le frontend sans authentification complète
 */
router.get('/public/settings', async (req, res) => {
    try {
        // Définir les clés publiques autorisées
        const publicKeys = [
            'telephone_responsable',
            'email_incidents',
            'qr_code_data',
            'max_sessions_per_terrain'
        ];

        const result = await database.query(`
            SELECT key, value, description
            FROM configuration
            WHERE key = ANY($1) AND is_encrypted = false
        `, [publicKeys]);

        const publicConfig = {};
        result.rows.forEach(row => {
            publicConfig[row.key] = {
                value: row.value,
                description: row.description
            };
        });

        res.json({ configuration: publicConfig });

    } catch (error) {
        logger.error('Erreur lors de la récupération de la configuration publique:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * POST /api/config/validate
 * Valider la configuration actuelle
 */
router.post('/validate', async (req, res) => {
    try {
        const result = await database.query(`
            SELECT key, value, description
            FROM configuration
            ORDER BY key
        `);

        const config = {};
        result.rows.forEach(row => {
            config[row.key] = row.value;
        });

        const validation = {
            valid: true,
            errors: [],
            warnings: [],
            recommendations: []
        };

        // Vérifications critiques
        const requiredKeys = [
            'telephone_responsable',
            'email_incidents',
            'qr_code_data'
        ];

        for (const key of requiredKeys) {
            if (!config[key] || config[key].trim() === '') {
                validation.valid = false;
                validation.errors.push(`Configuration manquante ou vide: ${key}`);
            }
        }

        // Validation du numéro de téléphone
        if (config.telephone_responsable && !/^[0-9+\s\-\(\)]{10,15}$/.test(config.telephone_responsable)) {
            validation.warnings.push('Le numéro de téléphone semble avoir un format invalide');
        }

        // Validation de l'email
        if (config.email_incidents && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email_incidents)) {
            validation.valid = false;
            validation.errors.push('L\'adresse email pour les incidents est invalide');
        }

        // Validation du nombre maximum de sessions
        const maxSessions = parseInt(config.max_sessions_per_terrain);
        if (isNaN(maxSessions) || maxSessions < 1 || maxSessions > 100) {
            validation.warnings.push('Le nombre maximum de sessions par terrain devrait être entre 1 et 100');
        }

        // Recommandations
        if (maxSessions && maxSessions < 5) {
            validation.recommendations.push('Considérez augmenter le nombre maximum de sessions par terrain pour plus de flexibilité');
        }

        logger.info('Validation de configuration effectuée', {
            valid: validation.valid,
            errorsCount: validation.errors.length,
            warningsCount: validation.warnings.length,
            userId: req.user.id
        });

        res.json({
            message: 'Validation de configuration terminée',
            validation
        });

    } catch (error) {
        logger.error('Erreur lors de la validation de la configuration:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * POST /api/config/reset
 * Réinitialiser la configuration aux valeurs par défaut
 */
router.post('/reset', async (req, res) => {
    try {
        const { keys } = req.body; // Optionnel: liste des clés à réinitialiser

        const defaultConfigs = [
            {
                key: 'telephone_responsable',
                value: '0123456789',
                description: 'Numéro de téléphone du responsable'
            },
            {
                key: 'email_incidents',
                value: 'incidents@club-tir-arc.fr',
                description: 'Email pour les notifications d\'incidents'
            },
            {
                key: 'qr_code_data',
                value: 'TERRAIN_TIR_ARC_ACCESS',
                description: 'Données du QR Code d\'accès'
            },
            {
                key: 'max_sessions_per_terrain',
                value: '10',
                description: 'Nombre maximum de sessions simultanées par terrain'
            }
        ];

        // Filtrer les configurations à réinitialiser si spécifié
        const configsToReset = keys && Array.isArray(keys)
            ? defaultConfigs.filter(config => keys.includes(config.key))
            : defaultConfigs;

        const result = await database.transaction(async (client) => {
            const resetResults = [];

            for (const config of configsToReset) {
                // Récupérer l'ancienne valeur pour l'audit
                const oldResult = await client.query(`
                    SELECT value FROM configuration WHERE key = $1
                `, [config.key]);

                const oldValue = oldResult.rows.length > 0 ? oldResult.rows[0].value : null;

                // Réinitialiser la configuration
                const resetResult = await client.query(`
                    INSERT INTO configuration (key, value, description)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (key)
                    DO UPDATE SET
                        value = EXCLUDED.value,
                        description = EXCLUDED.description,
                        updated_at = NOW()
                    RETURNING *
                `, [config.key, config.value, config.description]);

                resetResults.push(resetResult.rows[0]);

                // Enregistrer dans l'audit log
                await client.query(`
                    INSERT INTO audit_logs (user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    req.user.id,
                    'RESET',
                    'CONFIGURATION',
                    config.key,
                    oldValue ? JSON.stringify({ [config.key]: oldValue }) : null,
                    JSON.stringify({ [config.key]: config.value }),
                    req.ip,
                    req.get('User-Agent')
                ]);
            }

            return resetResults;
        });

        logger.info('Configuration réinitialisée', {
            keys: configsToReset.map(c => c.key),
            resetBy: req.user.id
        });

        logger.security('Configuration réinitialisée', {
            keysCount: configsToReset.length,
            userId: req.user.id,
            ip: req.ip
        });

        res.json({
            message: `${result.length} configuration(s) réinitialisée(s) avec succès`,
            resetConfigurations: result.map(config => ({
                key: config.key,
                value: config.value,
                description: config.description
            }))
        });

    } catch (error) {
        logger.error('Erreur lors de la réinitialisation de la configuration:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;