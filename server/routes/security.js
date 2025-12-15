const express = require('express');
const { requireAuth } = require('../middleware/auth');
const database = require('../config/database');
const logger = require('../utils/logger');
const crypto = require('crypto');

const router = express.Router();

/**
 * GET /api/v1/security/status
 * Vérifier le statut de sécurité du système (admin seulement)
 */
router.get('/status', requireAuth, async (req, res) => {
    try {
        logger.security('Vérification du statut de sécurité', {
            userId: req.user.id,
            ip: req.ip
        });

        // Vérifier la force des secrets (sans les exposer)
        const secretsStrength = {
            JWT_SECRET: process.env.JWT_SECRET?.length >= 32,
            JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET?.length >= 32,
            SESSION_SECRET: process.env.SESSION_SECRET?.length >= 32,
            ENCRYPTION_KEY: process.env.ENCRYPTION_KEY?.length >= 32
        };

        const allSecretsStrong = Object.values(secretsStrength).every(v => v === true);

        // Vérifier les configurations de sécurité
        const securityConfig = {
            nodeEnv: process.env.NODE_ENV,
            isProduction: process.env.NODE_ENV === 'production',
            bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
            corsConfigured: (process.env.ALLOWED_ORIGINS || '').length > 0,
            sslEnabled: process.env.NODE_ENV === 'production'
        };

        // Statistiques de sécurité
        const securityStats = await database.query(`
            SELECT
                (SELECT COUNT(*) FROM admin_users WHERE is_active = true) as active_users,
                (SELECT COUNT(*) FROM admin_users WHERE must_change_password = true) as users_need_password_change,
                (SELECT COUNT(*) FROM refresh_tokens WHERE expires_at > NOW() AND revoked = false) as active_sessions,
                (SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '24 hours') as audit_logs_24h,
                (SELECT COUNT(*) FROM audit_logs WHERE action = 'LOGIN' AND created_at > NOW() - INTERVAL '24 hours') as logins_24h,
                (SELECT COUNT(*) FROM admin_users WHERE locked_until > NOW()) as locked_accounts
        `);

        const stats = securityStats.rows[0];

        // Calculer un score de sécurité
        let securityScore = 100;

        if (!allSecretsStrong) securityScore -= 30;
        if (securityConfig.bcryptRounds < 12) securityScore -= 10;
        if (!securityConfig.corsConfigured) securityScore -= 15;
        if (securityConfig.nodeEnv !== 'production' && securityConfig.isProduction) securityScore -= 20;
        if (parseInt(stats.users_need_password_change) > 0) securityScore -= 5;

        const status = {
            timestamp: new Date().toISOString(),
            securityScore,
            level: securityScore >= 90 ? 'excellent' : securityScore >= 70 ? 'good' : securityScore >= 50 ? 'warning' : 'critical',
            checks: {
                secretsStrength: allSecretsStrong ? 'pass' : 'fail',
                bcryptStrength: securityConfig.bcryptRounds >= 12 ? 'pass' : 'warning',
                corsConfiguration: securityConfig.corsConfigured ? 'pass' : 'fail',
                productionMode: securityConfig.isProduction ? 'pass' : 'warning',
                ssl: securityConfig.sslEnabled ? 'pass' : 'warning'
            },
            statistics: {
                activeUsers: parseInt(stats.active_users),
                usersNeedingPasswordChange: parseInt(stats.users_need_password_change),
                activeSessions: parseInt(stats.active_sessions),
                auditLogs24h: parseInt(stats.audit_logs_24h),
                logins24h: parseInt(stats.logins_24h),
                lockedAccounts: parseInt(stats.locked_accounts)
            },
            recommendations: []
        };

        // Ajouter des recommandations
        if (!allSecretsStrong) {
            status.recommendations.push({
                severity: 'critical',
                message: 'Certains secrets sont trop courts ou manquants',
                action: 'Exécutez: npm run security:rotate'
            });
        }

        if (parseInt(stats.users_need_password_change) > 0) {
            status.recommendations.push({
                severity: 'warning',
                message: `${stats.users_need_password_change} utilisateur(s) doivent changer leur mot de passe`,
                action: 'Les utilisateurs doivent se connecter et changer leur mot de passe'
            });
        }

        if (securityConfig.bcryptRounds < 12) {
            status.recommendations.push({
                severity: 'warning',
                message: 'BCRYPT_ROUNDS devrait être ≥ 12',
                action: 'Mettez à jour BCRYPT_ROUNDS dans .env'
            });
        }

        res.json(status);

    } catch (error) {
        logger.error('Erreur lors de la vérification du statut de sécurité:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/v1/security/audit-logs
 * Récupérer les logs d'audit récents (admin seulement)
 */
router.get('/audit-logs', requireAuth, async (req, res) => {
    try {
        const { limit = 50, offset = 0, action, userId, startDate, endDate } = req.query;

        let query = `
            SELECT
                al.id,
                al.action,
                al.resource,
                al.resource_id,
                al.ip_address,
                al.user_agent,
                al.created_at,
                au.username,
                au.email
            FROM audit_logs al
            LEFT JOIN admin_users au ON al.user_id = au.id
            WHERE 1=1
        `;

        const params = [];
        let paramIndex = 1;

        if (action) {
            query += ` AND al.action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }

        if (userId) {
            query += ` AND al.user_id = $${paramIndex}`;
            params.push(userId);
            paramIndex++;
        }

        if (startDate) {
            query += ` AND al.created_at >= $${paramIndex}`;
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            query += ` AND al.created_at <= $${paramIndex}`;
            params.push(endDate);
            paramIndex++;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await database.query(query, params);

        // Compter le total
        let countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE 1=1`;
        const countParams = [];
        let countIndex = 1;

        if (action) {
            countQuery += ` AND action = $${countIndex}`;
            countParams.push(action);
            countIndex++;
        }

        if (userId) {
            countQuery += ` AND user_id = $${countIndex}`;
            countParams.push(userId);
            countIndex++;
        }

        const countResult = await database.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        logger.security('Consultation des logs d\'audit', {
            adminId: req.user.id,
            filters: { action, userId, startDate, endDate },
            ip: req.ip
        });

        res.json({
            logs: result.rows,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < total
            }
        });

    } catch (error) {
        logger.error('Erreur lors de la récupération des logs d\'audit:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * POST /api/v1/security/test-audit
 * Tester le système d'audit en créant une entrée de test (admin seulement)
 */
router.post('/test-audit', requireAuth, async (req, res) => {
    try {
        await database.query(`
            INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
        `, [req.user.id, 'TEST_AUDIT', 'SECURITY', req.ip, req.get('User-Agent')]);

        logger.security('Test d\'audit exécuté', {
            userId: req.user.id,
            ip: req.ip
        });

        res.json({
            message: 'Test d\'audit créé avec succès',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Erreur lors du test d\'audit:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/v1/security/active-sessions
 * Lister toutes les sessions actives (admin seulement)
 */
router.get('/active-sessions', requireAuth, async (req, res) => {
    try {
        const result = await database.query(`
            SELECT
                rt.id,
                rt.user_id,
                rt.created_at,
                rt.expires_at,
                au.username,
                au.email,
                (
                    SELECT al.ip_address
                    FROM audit_logs al
                    WHERE al.user_id = rt.user_id
                    AND al.action = 'LOGIN'
                    ORDER BY al.created_at DESC
                    LIMIT 1
                ) as last_ip
            FROM refresh_tokens rt
            JOIN admin_users au ON rt.user_id = au.id
            WHERE rt.expires_at > NOW()
            AND rt.revoked = false
            ORDER BY rt.created_at DESC
        `);

        logger.security('Consultation des sessions actives', {
            adminId: req.user.id,
            ip: req.ip
        });

        res.json({
            sessions: result.rows.map(row => ({
                id: row.id,
                userId: row.user_id,
                username: row.username,
                email: row.email,
                createdAt: row.created_at,
                expiresAt: row.expires_at,
                lastIp: row.last_ip
            })),
            total: result.rows.length
        });

    } catch (error) {
        logger.error('Erreur lors de la récupération des sessions actives:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * DELETE /api/v1/security/revoke-session/:sessionId
 * Révoquer une session spécifique (admin seulement)
 */
router.delete('/revoke-session/:sessionId', requireAuth, async (req, res) => {
    try {
        const { sessionId } = req.params;

        const result = await database.query(`
            UPDATE refresh_tokens
            SET revoked = true
            WHERE id = $1
            RETURNING user_id
        `, [sessionId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session non trouvée' });
        }

        // Enregistrer l'action dans l'audit log
        await database.query(`
            INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [req.user.id, 'REVOKE_SESSION_ADMIN', 'REFRESH_TOKEN', sessionId, req.ip, req.get('User-Agent')]);

        logger.security('Session révoquée par admin', {
            adminId: req.user.id,
            sessionId,
            targetUserId: result.rows[0].user_id,
            ip: req.ip
        });

        res.json({ message: 'Session révoquée avec succès' });

    } catch (error) {
        logger.error('Erreur lors de la révocation de la session:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;
