const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { auditMiddleware } = require('../middleware/audit');
const database = require('../config/database');
const logger = require('../utils/logger');
const websocketServer = require('../utils/websocket');
const { upload, handleUploadError } = require('../middleware/upload');
const { sendIncidentNotification } = require('../utils/email');
const path = require('path');

const router = express.Router();

// FIX: Retirer l'authentification globale pour permettre aux utilisateurs publics de signaler des incidents
// L'authentification sera ajoutée sur les routes qui en ont vraiment besoin (UPDATE, DELETE)
// router.use(requireAuth);

/**
 * POST /api/incidents
 * Créer un nouveau signalement d'incident (ACCÈS PUBLIC)
 */
router.post('/', validate(schemas.createIncident), auditMiddleware.createIncident, async (req, res) => {
    try {
        const { type_incident, description, terrain, photo_path } = req.body;

        // FIX: Permettre création sans user_id (utilisateur non authentifié)
        const userId = req.user ? req.user.id : null;

        const result = await database.query(`
            INSERT INTO incidents (type_incident, description, terrain, photo_path, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [type_incident, description, terrain, photo_path, userId]);

        const incident = result.rows[0];

        // Envoyer une notification par email
        await sendIncidentNotification(incident);

        // Notifier via WebSocket
        websocketServer.notifyNewIncident(incident);

        logger.info('Nouvel incident signalé', {
            incidentId: incident.id,
            type_incident,
            terrain,
            createdBy: userId || 'public'
        });

        logger.security('Incident créé', {
            incidentId: incident.id,
            type: type_incident,
            terrain,
            userId: userId || 'public',
            ip: req.ip
        });

        res.status(201).json({
            message: 'Incident signalé avec succès',
            incident: {
                id: incident.id,
                type_incident: incident.type_incident,
                description: incident.description,
                terrain: incident.terrain,
                photo_path: incident.photo_path,
                date_incident: incident.date_incident,
                statut: incident.statut
            }
        });

    } catch (error) {
        logger.error('Erreur lors de la création de l\'incident:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * POST /api/incidents/upload
 * Créer un incident avec photo (multipart/form-data) (ACCÈS PUBLIC)
 */
router.post('/upload', upload.single('photo'), handleUploadError, async (req, res) => {
    try {
        const { type_incident, description, terrain } = req.body;

        // Validation manuelle (car multipart ne passe pas par validate() de Joi)
        if (!type_incident || !description || !terrain) {
            return res.status(400).json({
                error: 'Champs requis: type_incident, description, terrain'
            });
        }

        if (!['interieur', 'exterieur'].includes(terrain)) {
            return res.status(400).json({
                error: 'Terrain invalide (interieur ou exterieur)'
            });
        }

        // Photo uploadée (optionnel)
        const photo_path = req.file ? `/uploads/incidents/${req.file.filename}` : null;
        const userId = req.user ? req.user.id : null;

        const result = await database.transaction(async (client) => {
            const incidentResult = await client.query(`
                INSERT INTO incidents (type_incident, description, terrain, photo_path, created_by)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [type_incident, description, terrain, photo_path, userId]);

            const incident = incidentResult.rows[0];

            // Audit log (si authentifié)
            if (userId) {
                await client.query(`
                    INSERT INTO audit_logs (user_id, action, resource, resource_id, new_values, ip_address, user_agent)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    userId,
                    'CREATE',
                    'INCIDENT',
                    incident.id,
                    JSON.stringify({ type_incident, description, terrain, photo_path }),
                    req.ip,
                    req.get('User-Agent')
                ]);
            }

            return incident;
        });

        // Envoyer notification email
        await sendIncidentNotification(result);

        // Notifier via WebSocket
        websocketServer.notifyNewIncident(result);

        logger.info('Incident avec photo créé', {
            incidentId: result.id,
            type_incident,
            terrain,
            hasPhoto: !!req.file,
            createdBy: userId || 'public'
        });

        res.status(201).json({
            message: 'Incident signalé avec succès',
            incident: {
                id: result.id,
                type_incident: result.type_incident,
                description: result.description,
                terrain: result.terrain,
                photo_path: result.photo_path,
                date_incident: result.date_incident,
                statut: result.statut
            }
        });

    } catch (error) {
        logger.error('Erreur lors de la création de l\'incident avec photo:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/incidents
 * Récupérer tous les incidents avec filtres optionnels (ACCÈS PUBLIC pour lecture)
 */
router.get('/', async (req, res) => {
    try {
        const { statut, terrain, dateDebut, dateFin, limit = 100, offset = 0 } = req.query;

        let query = `
            SELECT i.*,
                   au_created.username as created_by_username,
                   au_resolved.username as resolved_by_username
            FROM incidents i
            LEFT JOIN admin_users au_created ON i.created_by = au_created.id
            LEFT JOIN admin_users au_resolved ON i.resolved_by = au_resolved.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Appliquer les filtres
        if (statut) {
            query += ` AND i.statut = $${paramIndex}`;
            params.push(statut);
            paramIndex++;
        }

        if (terrain) {
            query += ` AND i.terrain = $${paramIndex}`;
            params.push(terrain);
            paramIndex++;
        }

        if (dateDebut) {
            query += ` AND i.date_incident >= $${paramIndex}`;
            params.push(dateDebut);
            paramIndex++;
        }

        if (dateFin) {
            query += ` AND i.date_incident <= $${paramIndex}`;
            params.push(dateFin);
            paramIndex++;
        }

        // Tri et pagination
        query += ` ORDER BY i.date_incident DESC`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await database.query(query, params);

        // Compter le total pour la pagination
        let countQuery = `SELECT COUNT(*) as total FROM incidents i WHERE 1=1`;
        const countParams = [];
        let countParamIndex = 1;

        if (statut) {
            countQuery += ` AND i.statut = $${countParamIndex}`;
            countParams.push(statut);
            countParamIndex++;
        }

        if (terrain) {
            countQuery += ` AND i.terrain = $${countParamIndex}`;
            countParams.push(terrain);
            countParamIndex++;
        }

        if (dateDebut) {
            countQuery += ` AND i.date_incident >= $${countParamIndex}`;
            countParams.push(dateDebut);
            countParamIndex++;
        }

        if (dateFin) {
            countQuery += ` AND i.date_incident <= $${countParamIndex}`;
            countParams.push(dateFin);
            countParamIndex++;
        }

        const countResult = await database.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            incidents: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < total
            }
        });

    } catch (error) {
        logger.error('Erreur lors de la récupération des incidents:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/incidents/stats
 * Statistiques des incidents
 */
router.get('/stats', async (req, res) => {
    try {
        // Statistiques par statut
        const statutStatsResult = await database.query(`
            SELECT statut, COUNT(*) as count
            FROM incidents
            GROUP BY statut
            ORDER BY count DESC
        `);

        // Statistiques par terrain
        const terrainStatsResult = await database.query(`
            SELECT terrain, COUNT(*) as count
            FROM incidents
            GROUP BY terrain
            ORDER BY count DESC
        `);

        // Statistiques par type d'incident (top 10)
        const typeStatsResult = await database.query(`
            SELECT type_incident, COUNT(*) as count
            FROM incidents
            GROUP BY type_incident
            ORDER BY count DESC
            LIMIT 10
        `);

        // Statistiques générales
        const generalStatsResult = await database.query(`
            SELECT
                COUNT(*) as total_incidents,
                COUNT(CASE WHEN statut = 'en_attente' THEN 1 END) as pending_incidents,
                COUNT(CASE WHEN statut = 'en_cours' THEN 1 END) as in_progress_incidents,
                COUNT(CASE WHEN statut = 'resolu' THEN 1 END) as resolved_incidents,
                AVG(CASE
                    WHEN statut = 'resolu' AND date_resolution IS NOT NULL
                    THEN EXTRACT(EPOCH FROM (date_resolution - date_incident))/3600
                END) as avg_resolution_time_hours
            FROM incidents
        `);

        // Évolution des incidents par mois (12 derniers mois)
        const evolutionResult = await database.query(`
            SELECT
                DATE_TRUNC('month', date_incident) as month,
                COUNT(*) as count
            FROM incidents
            WHERE date_incident >= NOW() - INTERVAL '12 months'
            GROUP BY month
            ORDER BY month
        `);

        res.json({
            byStatut: statutStatsResult.rows,
            byTerrain: terrainStatsResult.rows,
            byType: typeStatsResult.rows,
            general: generalStatsResult.rows[0],
            evolution: evolutionResult.rows
        });

    } catch (error) {
        logger.error('Erreur lors de la récupération des statistiques d\'incidents:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/incidents/:id
 * Récupérer un incident spécifique
 */
router.get('/:id', validate(schemas.uuidParam, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await database.query(`
            SELECT i.*,
                   au_created.username as created_by_username,
                   au_resolved.username as resolved_by_username
            FROM incidents i
            LEFT JOIN admin_users au_created ON i.created_by = au_created.id
            LEFT JOIN admin_users au_resolved ON i.resolved_by = au_resolved.id
            WHERE i.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Incident non trouvé' });
        }

        res.json({ incident: result.rows[0] });

    } catch (error) {
        logger.error('Erreur lors de la récupération de l\'incident:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * PUT /api/incidents/:id
 * Mettre à jour un incident (AUTHENTIFICATION REQUISE)
 */
router.put('/:id', requireAuth, validate(schemas.uuidParam, 'params'), validate(schemas.updateIncident), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Vérifier que l'incident existe
        const existingResult = await database.query(`
            SELECT * FROM incidents WHERE id = $1
        `, [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Incident non trouvé' });
        }

        const existingIncident = existingResult.rows[0];

        // Construire la requête de mise à jour dynamiquement
        const setClause = [];
        const params = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            setClause.push(`${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
        });

        // Si on marque l'incident comme résolu, définir date_resolution et resolved_by
        if (updates.statut === 'resolu') {
            setClause.push(`date_resolution = NOW()`);
            setClause.push(`resolved_by = $${paramIndex}`);
            params.push(req.user.id);
            paramIndex++;
        }

        const query = `
            UPDATE incidents
            SET ${setClause.join(', ')}, updated_at = NOW()
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        params.push(id);

        const result = await database.transaction(async (client) => {
            const updateResult = await client.query(query, params);
            const updatedIncident = updateResult.rows[0];

            // Enregistrer dans l'audit log
            await client.query(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                req.user.id,
                'UPDATE',
                'INCIDENT',
                id,
                JSON.stringify(existingIncident),
                JSON.stringify(updates),
                req.ip,
                req.get('User-Agent')
            ]);

            return updatedIncident;
        });

        logger.info('Incident mis à jour', {
            incidentId: id,
            updates,
            updatedBy: req.user.id
        });

        // Notifier via WebSocket
        websocketServer.notifyIncidentUpdated(result, existingIncident.statut);

        // Si l'incident est résolu, envoyer une notification
        if (updates.statut === 'resolu') {
            logger.security('Incident résolu', {
                incidentId: id,
                resolvedBy: req.user.id,
                ip: req.ip
            });
        }

        res.json({
            message: 'Incident mis à jour avec succès',
            incident: result
        });

    } catch (error) {
        logger.error('Erreur lors de la mise à jour de l\'incident:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * DELETE /api/incidents/:id
 * Supprimer un incident (AUTHENTIFICATION REQUISE)
 */
router.delete('/:id', requireAuth, validate(schemas.uuidParam, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await database.transaction(async (client) => {
            // Récupérer l'incident avant suppression pour l'audit log
            const incidentResult = await client.query(`
                SELECT * FROM incidents WHERE id = $1
            `, [id]);

            if (incidentResult.rows.length === 0) {
                throw new Error('Incident non trouvé');
            }

            const incident = incidentResult.rows[0];

            // Supprimer l'incident
            await client.query(`
                DELETE FROM incidents WHERE id = $1
            `, [id]);

            // Enregistrer dans l'audit log
            await client.query(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, old_values, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                req.user.id,
                'DELETE',
                'INCIDENT',
                id,
                JSON.stringify(incident),
                req.ip,
                req.get('User-Agent')
            ]);

            return incident;
        });

        logger.info('Incident supprimé', {
            incidentId: id,
            incident: result,
            deletedBy: req.user.id
        });

        logger.security('Incident supprimé', {
            incidentId: id,
            deletedBy: req.user.id,
            ip: req.ip
        });

        // Notifier via WebSocket
        websocketServer.notifyIncidentDeleted(id);

        res.json({ message: 'Incident supprimé avec succès' });

    } catch (error) {
        if (error.message === 'Incident non trouvé') {
            return res.status(404).json({ error: error.message });
        }

        logger.error('Erreur lors de la suppression de l\'incident:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;