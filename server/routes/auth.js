const express = require('express');
const { authManager, requireAuth, refreshToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { authRateLimit } = require('../middleware/security');
const database = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Appliquer le rate limiting strict aux routes d'authentification
router.use(authRateLimit);

/**
 * POST /api/auth/login
 * Connexion administrateur
 */
router.post('/login', validate(schemas.login), async (req, res) => {
    try {
        const { username, password } = req.body;

        logger.security('Tentative de connexion', {
            username,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        const result = await authManager.authenticateUser(username, password, req);

        if (!result.success) {
            return res.status(401).json({ error: result.error });
        }

        // Enregistrer la connexion dans l'audit log
        await database.query(`
            INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
        `, [result.user.id, 'LOGIN', 'AUTH', req.ip, req.get('User-Agent')]);

        res.json({
            message: 'Connexion réussie',
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: 15 * 60 // 15 minutes en secondes
        });

    } catch (error) {
        logger.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * POST /api/auth/refresh
 * Renouvellement du token d'accès
 */
router.post('/refresh', refreshToken);

/**
 * POST /api/auth/logout
 * Déconnexion (révoque le refresh token)
 */
router.post('/logout', requireAuth, async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (token) {
            await authManager.revokeRefreshToken(req.user.id, token);
        }

        // Enregistrer la déconnexion dans l'audit log
        await database.query(`
            INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
        `, [req.user.id, 'LOGOUT', 'AUTH', req.ip, req.get('User-Agent')]);

        logger.security('Déconnexion', {
            userId: req.user.id,
            username: req.user.username,
            ip: req.ip
        });

        res.json({ message: 'Déconnexion réussie' });

    } catch (error) {
        logger.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * POST /api/auth/logout-all
 * Déconnexion de tous les appareils (révoque tous les refresh tokens)
 */
router.post('/logout-all', requireAuth, async (req, res) => {
    try {
        await authManager.revokeAllRefreshTokens(req.user.id);

        // Enregistrer l'action dans l'audit log
        await database.query(`
            INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
        `, [req.user.id, 'LOGOUT_ALL', 'AUTH', req.ip, req.get('User-Agent')]);

        logger.security('Déconnexion de tous les appareils', {
            userId: req.user.id,
            username: req.user.username,
            ip: req.ip
        });

        res.json({ message: 'Déconnexion de tous les appareils réussie' });

    } catch (error) {
        logger.error('Erreur lors de la déconnexion globale:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/auth/me
 * Informations sur l'utilisateur connecté
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        const userResult = await database.query(`
            SELECT id, username, email, created_at, last_login
            FROM admin_users
            WHERE id = $1
        `, [req.user.id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.json({ user: userResult.rows[0] });

    } catch (error) {
        logger.error('Erreur lors de la récupération des informations utilisateur:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * POST /api/auth/change-password
 * Changement de mot de passe
 */
router.post('/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validation basique
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
        }

        if (newPassword.length < 12) {
            return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 12 caractères' });
        }

        // Vérifier le mot de passe actuel
        const userResult = await database.query(`
            SELECT password_hash, salt FROM admin_users WHERE id = $1
        `, [req.user.id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const { password_hash, salt } = userResult.rows[0];
        const isValidPassword = await authManager.verifyPassword(currentPassword, password_hash, salt);

        if (!isValidPassword) {
            logger.security('Tentative de changement de mot de passe avec mot de passe actuel invalide', {
                userId: req.user.id,
                ip: req.ip
            });

            return res.status(401).json({ error: 'Mot de passe actuel invalide' });
        }

        // Hacher le nouveau mot de passe
        const { hash: newHash, salt: newSalt } = await authManager.hashPassword(newPassword);

        // Mettre à jour le mot de passe
        await database.query(`
            UPDATE admin_users
            SET password_hash = $1, salt = $2
            WHERE id = $3
        `, [newHash, newSalt, req.user.id]);

        // Révoquer tous les refresh tokens pour forcer une nouvelle connexion
        await authManager.revokeAllRefreshTokens(req.user.id);

        // Enregistrer l'action dans l'audit log
        await database.query(`
            INSERT INTO audit_logs (user_id, action, resource, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
        `, [req.user.id, 'CHANGE_PASSWORD', 'AUTH', req.ip, req.get('User-Agent')]);

        logger.security('Mot de passe changé', {
            userId: req.user.id,
            username: req.user.username,
            ip: req.ip
        });

        res.json({ message: 'Mot de passe changé avec succès. Veuillez vous reconnecter.' });

    } catch (error) {
        logger.error('Erreur lors du changement de mot de passe:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * POST /api/auth/create-admin
 * Création d'un nouvel utilisateur administrateur (protection supplémentaire requise)
 */
router.post('/create-admin', requireAuth, validate(schemas.createAdmin), async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Vérifier que l'utilisateur actuel a les droits (pour l'instant, tout admin peut créer un autre admin)
        // Dans une vraie application, on pourrait avoir un système de rôles plus granulaire

        const newUser = await authManager.createAdminUser(username, email, password);

        // Enregistrer l'action dans l'audit log
        await database.query(`
            INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent, new_values)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            req.user.id,
            'CREATE_ADMIN',
            'ADMIN_USER',
            newUser.id,
            req.ip,
            req.get('User-Agent'),
            JSON.stringify({ username, email })
        ]);

        logger.security('Nouvel administrateur créé', {
            createdBy: req.user.id,
            newUserId: newUser.id,
            username,
            email,
            ip: req.ip
        });

        res.status(201).json({
            message: 'Administrateur créé avec succès',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                created_at: newUser.created_at
            }
        });

    } catch (error) {
        if (error.message.includes('existe déjà')) {
            return res.status(409).json({ error: error.message });
        }

        logger.error('Erreur lors de la création de l\'administrateur:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * GET /api/auth/sessions
 * Lister les sessions actives de l'utilisateur
 */
router.get('/sessions', requireAuth, async (req, res) => {
    try {
        const result = await database.query(`
            SELECT id, expires_at, created_at, revoked
            FROM refresh_tokens
            WHERE user_id = $1 AND expires_at > NOW()
            ORDER BY created_at DESC
        `, [req.user.id]);

        const sessions = result.rows.map(row => ({
            id: row.id,
            createdAt: row.created_at,
            expiresAt: row.expires_at,
            active: !row.revoked
        }));

        res.json({ sessions });

    } catch (error) {
        logger.error('Erreur lors de la récupération des sessions:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * DELETE /api/auth/sessions/:sessionId
 * Révoquer une session spécifique
 */
router.delete('/sessions/:sessionId', requireAuth, validate(schemas.uuidParam, 'params'), async (req, res) => {
    try {
        const { sessionId } = req.params;

        const result = await database.query(`
            UPDATE refresh_tokens
            SET revoked = true
            WHERE id = $1 AND user_id = $2
            RETURNING id
        `, [sessionId, req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Session non trouvée' });
        }

        // Enregistrer l'action dans l'audit log
        await database.query(`
            INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [req.user.id, 'REVOKE_SESSION', 'REFRESH_TOKEN', sessionId, req.ip, req.get('User-Agent')]);

        logger.security('Session révoquée', {
            userId: req.user.id,
            sessionId,
            ip: req.ip
        });

        res.json({ message: 'Session révoquée avec succès' });

    } catch (error) {
        logger.error('Erreur lors de la révocation de la session:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;