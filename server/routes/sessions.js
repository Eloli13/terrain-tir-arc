const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const database = require('../config/database');
const logger = require('../utils/logger');
const websocketServer = require('../utils/websocket');

const router = express.Router();

/**
 * POST /api/sessions
 * Créer une nouvelle session de tir (accès public)
 */
router.post('/', validate(schemas.createSession), async (req, res) => {
    try {
        const { nom, prenom, type_tireur, nombre_tireurs, terrain } = req.body;

        // Vérifier s'il y a déjà une session active pour cette personne sur ce terrain
        const existingSessionResult = await database.query(`
            SELECT id FROM sessions
            WHERE nom = $1 AND prenom = $2 AND terrain = $3 AND active = true
        `, [nom, prenom, terrain]);

        if (existingSessionResult.rows.length > 0) {
            return res.status(409).json({
                error: 'Une session est déjà active pour cette personne sur ce terrain'
            });
        }

        // Vérifier la limite de sessions simultanées par terrain
        const maxSessionsResult = await database.query(`
            SELECT value FROM configuration WHERE key = 'max_sessions_per_terrain'
        `);

        const maxSessions = maxSessionsResult.rows.length > 0
            ? parseInt(maxSessionsResult.rows[0].value)
            : 10;

        const activeSessionsResult = await database.query(`
            SELECT COUNT(*) as count FROM sessions WHERE terrain = $1 AND active = true
        `, [terrain]);

        const activeSessions = parseInt(activeSessionsResult.rows[0].count);

        if (activeSessions >= maxSessions) {
            return res.status(409).json({
                error: `Nombre maximum de sessions atteint pour le terrain ${terrain} (${maxSessions})`
            });
        }

        // Créer la session (sans user_id si non authentifié)
        const userId = req.user ? req.user.id : null;

        const result = await database.transaction(async (client) => {
            const sessionResult = await client.query(`
                INSERT INTO sessions (nom, prenom, type_tireur, nombre_tireurs, terrain, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `, [nom, prenom, type_tireur, nombre_tireurs, terrain, userId]);

            const session = sessionResult.rows[0];

            // Enregistrer dans l'audit log (seulement si utilisateur authentifié)
            if (userId) {
                await client.query(`
                    INSERT INTO audit_logs (user_id, action, resource, resource_id, new_values, ip_address, user_agent)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    userId,
                    'CREATE',
                    'SESSION',
                    session.id,
                    JSON.stringify({ nom, prenom, type_tireur, nombre_tireurs, terrain }),
                    req.ip,
                    req.get('User-Agent')
                ]);
            }

            return session;
        });

        logger.info('Nouvelle session créée', {
            sessionId: result.id,
            nom,
            prenom,
            terrain,
            createdBy: userId || 'public'
        });

        // Notifier via WebSocket
        websocketServer.notifyNewSession(result);

        res.status(201).json({
            message: 'Session créée avec succès',
            session: {
                id: result.id,
                nom: result.nom,
                prenom: result.prenom,
                type_tireur: result.type_tireur,
                nombre_tireurs: result.nombre_tireurs,
                terrain: result.terrain,
                date_debut: result.date_debut,
                active: result.active
            }
        });

    } catch (error) {
        logger.error('Erreur lors de la création de la session:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/sessions
 * Récupérer toutes les sessions avec filtres optionnels
 */
router.get('/', validate(schemas.sessionFilters, 'query'), async (req, res) => {
    try {
        const { dateDebut, dateFin, terrain, type_tireur, limit, offset } = req.query;

        let query = `
            SELECT s.*, au.username as created_by_username
            FROM sessions s
            LEFT JOIN admin_users au ON s.created_by = au.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        // Appliquer les filtres
        if (dateDebut) {
            query += ` AND s.date_debut >= $${paramIndex}`;
            params.push(dateDebut);
            paramIndex++;
        }

        if (dateFin) {
            query += ` AND s.date_debut <= $${paramIndex}`;
            params.push(dateFin);
            paramIndex++;
        }

        if (terrain) {
            query += ` AND s.terrain = $${paramIndex}`;
            params.push(terrain);
            paramIndex++;
        }

        if (type_tireur) {
            query += ` AND s.type_tireur = $${paramIndex}`;
            params.push(type_tireur);
            paramIndex++;
        }

        // Tri et pagination
        query += ` ORDER BY s.date_debut DESC`;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await database.query(query, params);

        // Compter le total pour la pagination
        let countQuery = `
            SELECT COUNT(*) as total FROM sessions s WHERE 1=1
        `;
        const countParams = [];
        let countParamIndex = 1;

        if (dateDebut) {
            countQuery += ` AND s.date_debut >= $${countParamIndex}`;
            countParams.push(dateDebut);
            countParamIndex++;
        }

        if (dateFin) {
            countQuery += ` AND s.date_debut <= $${countParamIndex}`;
            countParams.push(dateFin);
            countParamIndex++;
        }

        if (terrain) {
            countQuery += ` AND s.terrain = $${countParamIndex}`;
            countParams.push(terrain);
            countParamIndex++;
        }

        if (type_tireur) {
            countQuery += ` AND s.type_tireur = $${countParamIndex}`;
            countParams.push(type_tireur);
            countParamIndex++;
        }

        const countResult = await database.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            sessions: result.rows,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        });

    } catch (error) {
        logger.error('Erreur lors de la récupération des sessions:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/sessions/active
 * Récupérer uniquement les sessions actives
 */
router.get('/active', async (req, res) => {
    try {
        const result = await database.query(`
            SELECT s.*, au.username as created_by_username
            FROM sessions s
            LEFT JOIN admin_users au ON s.created_by = au.id
            WHERE s.active = true
            ORDER BY s.date_debut DESC
        `);

        res.json({ sessions: result.rows });

    } catch (error) {
        logger.error('Erreur lors de la récupération des sessions actives:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/sessions/stats
 * Statistiques des sessions
 */
router.get('/stats', async (req, res) => {
    try {
        // Sessions actives par terrain
        const activeStatsResult = await database.query(`
            SELECT
                terrain,
                COUNT(*) as sessions_count,
                SUM(nombre_tireurs) as total_tireurs
            FROM sessions
            WHERE active = true
            GROUP BY terrain
        `);

        // Statistiques générales
        const generalStatsResult = await database.query(`
            SELECT
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN active = true THEN 1 END) as active_sessions,
                SUM(nombre_tireurs) as total_tireurs_all_time,
                SUM(CASE WHEN active = true THEN nombre_tireurs ELSE 0 END) as active_tireurs
            FROM sessions
        `);

        // Statistiques par type de tireur (sessions actives)
        const typeStatsResult = await database.query(`
            SELECT
                type_tireur,
                COUNT(*) as sessions_count,
                SUM(nombre_tireurs) as total_tireurs
            FROM sessions
            WHERE active = true
            GROUP BY type_tireur
            ORDER BY sessions_count DESC
        `);

        const activeStats = {
            interieur: { sessions: 0, tireurs: 0 },
            exterieur: { sessions: 0, tireurs: 0 }
        };

        activeStatsResult.rows.forEach(row => {
            activeStats[row.terrain] = {
                sessions: parseInt(row.sessions_count),
                tireurs: parseInt(row.total_tireurs)
            };
        });

        res.json({
            active: activeStats,
            general: generalStatsResult.rows[0],
            byType: typeStatsResult.rows
        });

    } catch (error) {
        logger.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/sessions/:id
 * Récupérer une session spécifique
 */
router.get('/:id', validate(schemas.uuidParam, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await database.query(`
            SELECT s.*, au.username as created_by_username
            FROM sessions s
            LEFT JOIN admin_users au ON s.created_by = au.id
            WHERE s.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session non trouvée' });
        }

        res.json({ session: result.rows[0] });

    } catch (error) {
        logger.error('Erreur lors de la récupération de la session:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * PUT /api/sessions/:id
 * Mettre à jour une session (principalement pour terminer une session)
 */
router.put('/:id', validate(schemas.uuidParam, 'params'), validate(schemas.updateSession), async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Vérifier que la session existe
        const existingResult = await database.query(`
            SELECT * FROM sessions WHERE id = $1
        `, [id]);

        if (existingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Session non trouvée' });
        }

        const existingSession = existingResult.rows[0];

        // Construire la requête de mise à jour dynamiquement
        const setClause = [];
        const params = [];
        let paramIndex = 1;

        Object.entries(updates).forEach(([key, value]) => {
            setClause.push(`${key} = $${paramIndex}`);
            params.push(value);
            paramIndex++;
        });

        // Si on termine la session, définir date_fin
        if (updates.active === false && !updates.date_fin) {
            setClause.push(`date_fin = NOW()`);
        }

        const query = `
            UPDATE sessions
            SET ${setClause.join(', ')}, updated_at = NOW()
            WHERE id = $${paramIndex}
            RETURNING *
        `;
        params.push(id);

        const userId = req.user ? req.user.id : null;

        const result = await database.transaction(async (client) => {
            const updateResult = await client.query(query, params);
            const updatedSession = updateResult.rows[0];

            // Enregistrer dans l'audit log (seulement si utilisateur authentifié)
            if (userId) {
                await client.query(`
                    INSERT INTO audit_logs (user_id, action, resource, resource_id, old_values, new_values, ip_address, user_agent)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                    userId,
                    'UPDATE',
                    'SESSION',
                    id,
                    JSON.stringify(existingSession),
                    JSON.stringify(updates),
                    req.ip,
                    req.get('User-Agent')
                ]);
            }

            return updatedSession;
        });

        logger.info('Session mise à jour', {
            sessionId: id,
            updates,
            updatedBy: userId || 'public'
        });

        // Notifier via WebSocket si la session est terminée
        if (updates.active === false) {
            websocketServer.notifySessionEnded(result);
        }

        res.json({
            message: 'Session mise à jour avec succès',
            session: result
        });

    } catch (error) {
        logger.error('Erreur lors de la mise à jour de la session:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * DELETE /api/sessions/:id
 * Supprimer une session
 */
router.delete('/:id', validate(schemas.uuidParam, 'params'), async (req, res) => {
    try {
        const { id } = req.params;

        const result = await database.transaction(async (client) => {
            // Récupérer la session avant suppression pour l'audit log
            const sessionResult = await client.query(`
                SELECT * FROM sessions WHERE id = $1
            `, [id]);

            if (sessionResult.rows.length === 0) {
                throw new Error('Session non trouvée');
            }

            const session = sessionResult.rows[0];

            // Supprimer la session
            await client.query(`
                DELETE FROM sessions WHERE id = $1
            `, [id]);

            // Enregistrer dans l'audit log
            await client.query(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, old_values, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                req.user.id,
                'DELETE',
                'SESSION',
                id,
                JSON.stringify(session),
                req.ip,
                req.get('User-Agent')
            ]);

            return session;
        });

        logger.info('Session supprimée', {
            sessionId: id,
            session: result,
            deletedBy: req.user.id
        });

        res.json({ message: 'Session supprimée avec succès' });

    } catch (error) {
        if (error.message === 'Session non trouvée') {
            return res.status(404).json({ error: error.message });
        }

        logger.error('Erreur lors de la suppression de la session:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;