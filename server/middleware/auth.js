const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const database = require('../config/database');
const logger = require('../utils/logger');

class AuthManager {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET;
        this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
        this.bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;

        if (!this.jwtSecret || !this.jwtRefreshSecret) {
            throw new Error('JWT secrets must be defined in environment variables');
        }

        if (this.jwtSecret.length < 32 || this.jwtRefreshSecret.length < 32) {
            throw new Error('JWT secrets must be at least 32 characters long');
        }
    }

    // Générer un salt cryptographiquement sécurisé
    generateSalt() {
        return crypto.randomBytes(32).toString('hex');
    }

    // Hacher un mot de passe avec bcrypt et un salt personnalisé
    async hashPassword(password, salt = null) {
        if (!salt) {
            salt = this.generateSalt();
        }

        // Combiner le mot de passe avec le salt personnalisé
        const saltedPassword = password + salt;

        // Hacher avec bcrypt
        const bcryptHash = await bcrypt.hash(saltedPassword, this.bcryptRounds);

        return { hash: bcryptHash, salt };
    }

    // Vérifier un mot de passe
    async verifyPassword(password, hash, salt) {
        try {
            const saltedPassword = password + salt;
            return await bcrypt.compare(saltedPassword, hash);
        } catch (error) {
            logger.error('Erreur lors de la vérification du mot de passe:', error);
            return false;
        }
    }

    // Générer un JWT token
    generateAccessToken(payload) {
        return jwt.sign(payload, this.jwtSecret, {
            algorithm: 'HS256', // Algorithme explicite pour la sécurité
            expiresIn: '15m', // Token d'accès court
            issuer: 'terrain-tir-arc-server',
            audience: 'terrain-tir-arc-client'
        });
    }

    // Générer un refresh token
    generateRefreshToken(payload) {
        return jwt.sign(payload, this.jwtRefreshSecret, {
            algorithm: 'HS256', // Algorithme explicite pour la sécurité
            expiresIn: '7d', // Refresh token plus long
            issuer: 'terrain-tir-arc-server',
            audience: 'terrain-tir-arc-client'
        });
    }

    // Vérifier un access token
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret, {
                issuer: 'terrain-tir-arc-server',
                audience: 'terrain-tir-arc-client'
            });
        } catch (error) {
            logger.security('Token d\'accès invalide', { error: error.message });
            return null;
        }
    }

    // Vérifier un refresh token
    verifyRefreshToken(token) {
        try {
            return jwt.verify(token, this.jwtRefreshSecret, {
                issuer: 'terrain-tir-arc-server',
                audience: 'terrain-tir-arc-client'
            });
        } catch (error) {
            logger.security('Refresh token invalide', { error: error.message });
            return null;
        }
    }

    // Stocker un refresh token en base de données
    async storeRefreshToken(userId, token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

        await database.query(`
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
        `, [userId, tokenHash, expiresAt]);

        // Nettoyer les anciens tokens expirés
        await this.cleanupExpiredTokens();
    }

    // Vérifier si un refresh token existe en base
    async isRefreshTokenValid(userId, token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const result = await database.query(`
            SELECT id FROM refresh_tokens
            WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW() AND revoked = false
        `, [userId, tokenHash]);

        return result.rows.length > 0;
    }

    // Révoquer un refresh token
    async revokeRefreshToken(userId, token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        await database.query(`
            UPDATE refresh_tokens
            SET revoked = true
            WHERE user_id = $1 AND token_hash = $2
        `, [userId, tokenHash]);
    }

    // Révoquer tous les refresh tokens d'un utilisateur
    async revokeAllRefreshTokens(userId) {
        await database.query(`
            UPDATE refresh_tokens
            SET revoked = true
            WHERE user_id = $1
        `, [userId]);
    }

    // Nettoyer les tokens expirés
    async cleanupExpiredTokens() {
        await database.query(`
            DELETE FROM refresh_tokens
            WHERE expires_at < NOW() OR revoked = true
        `);
    }

    // Créer un utilisateur administrateur
    async createAdminUser(username, email, password) {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await database.query(`
            SELECT id FROM admin_users WHERE username = $1 OR email = $2
        `, [username, email]);

        if (existingUser.rows.length > 0) {
            throw new Error('Un utilisateur avec ce nom d\'utilisateur ou cet email existe déjà');
        }

        // Hacher le mot de passe
        const { hash, salt } = await this.hashPassword(password);

        // Insérer l'utilisateur
        const result = await database.query(`
            INSERT INTO admin_users (username, email, password_hash, salt)
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, email, created_at
        `, [username, email, hash, salt]);

        logger.security('Nouvel utilisateur administrateur créé', {
            userId: result.rows[0].id,
            username,
            email
        });

        return result.rows[0];
    }

    // Authentifier un utilisateur
    async authenticateUser(username, password, req) {
        try {
            // Récupérer l'utilisateur
            const userResult = await database.query(`
                SELECT id, username, email, password_hash, salt, is_active, must_change_password, login_attempts, locked_until
                FROM admin_users
                WHERE username = $1 OR email = $1
            `, [username]);

            if (userResult.rows.length === 0) {
                logger.security('Tentative de connexion avec utilisateur inexistant', {
                    username,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });
                return { success: false, error: 'Identifiants invalides' };
            }

            const user = userResult.rows[0];

            // Vérifier si le compte est actif
            if (!user.is_active) {
                logger.security('Tentative de connexion sur compte désactivé', {
                    userId: user.id,
                    username: user.username,
                    ip: req.ip
                });
                return { success: false, error: 'Compte désactivé' };
            }

            // Vérifier si le compte est verrouillé
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                logger.security('Tentative de connexion sur compte verrouillé', {
                    userId: user.id,
                    username: user.username,
                    lockedUntil: user.locked_until,
                    ip: req.ip
                });
                return { success: false, error: 'Compte temporairement verrouillé' };
            }

            // Vérifier le mot de passe
            const isValidPassword = await this.verifyPassword(password, user.password_hash, user.salt);

            if (!isValidPassword) {
                // Incrémenter le compteur de tentatives
                const newAttempts = user.login_attempts + 1;
                let lockedUntil = null;

                // Verrouiller le compte après 5 tentatives
                if (newAttempts >= 5) {
                    lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
                }

                await database.query(`
                    UPDATE admin_users
                    SET login_attempts = $1, locked_until = $2
                    WHERE id = $3
                `, [newAttempts, lockedUntil, user.id]);

                logger.security('Tentative de connexion avec mot de passe invalide', {
                    userId: user.id,
                    username: user.username,
                    attempts: newAttempts,
                    lockedUntil,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });

                return {
                    success: false,
                    error: lockedUntil
                        ? 'Trop de tentatives. Compte verrouillé pour 30 minutes.'
                        : 'Identifiants invalides'
                };
            }

            // Vérifier si l'utilisateur doit changer son mot de passe
            if (user.must_change_password) {
                logger.security('Connexion avec mot de passe à changer', {
                    userId: user.id,
                    username: user.username,
                    ip: req.ip
                });

                return {
                    success: false,
                    error: 'Vous devez changer votre mot de passe par défaut',
                    mustChangePassword: true,
                    userId: user.id
                };
            }

            // Connexion réussie - réinitialiser le compteur
            await database.query(`
                UPDATE admin_users
                SET login_attempts = 0, locked_until = NULL, last_login = NOW()
                WHERE id = $1
            `, [user.id]);

            // Créer les tokens
            const tokenPayload = {
                userId: user.id,
                username: user.username,
                email: user.email
            };

            const accessToken = this.generateAccessToken(tokenPayload);
            const refreshToken = this.generateRefreshToken(tokenPayload);

            // Stocker le refresh token
            await this.storeRefreshToken(user.id, refreshToken);

            logger.security('Connexion réussie', {
                userId: user.id,
                username: user.username,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                accessToken,
                refreshToken
            };

        } catch (error) {
            logger.error('Erreur lors de l\'authentification:', error);
            return { success: false, error: 'Erreur interne du serveur' };
        }
    }
}

const authManager = new AuthManager();

// Middleware pour vérifier l'authentification
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token d\'authentification requis' });
        }

        const token = authHeader.substring(7);
        const payload = authManager.verifyAccessToken(token);

        if (!payload) {
            return res.status(401).json({ error: 'Token invalide ou expiré' });
        }

        // Vérifier que l'utilisateur existe toujours
        const userResult = await database.query(`
            SELECT id, username, email, is_active FROM admin_users WHERE id = $1
        `, [payload.userId]);

        if (userResult.rows.length === 0 || !userResult.rows[0].is_active) {
            return res.status(401).json({ error: 'Utilisateur non trouvé ou désactivé' });
        }

        req.user = userResult.rows[0];
        next();

    } catch (error) {
        logger.error('Erreur dans le middleware d\'authentification:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
};

// Middleware pour renouveler le token
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token requis' });
        }

        const payload = authManager.verifyRefreshToken(refreshToken);
        if (!payload) {
            return res.status(401).json({ error: 'Refresh token invalide' });
        }

        // Vérifier que le token existe en base
        const isValid = await authManager.isRefreshTokenValid(payload.userId, refreshToken);
        if (!isValid) {
            return res.status(401).json({ error: 'Refresh token révoqué ou expiré' });
        }

        // Générer un nouveau access token
        const newTokenPayload = {
            userId: payload.userId,
            username: payload.username,
            email: payload.email
        };

        const newAccessToken = authManager.generateAccessToken(newTokenPayload);

        res.json({ accessToken: newAccessToken });

    } catch (error) {
        logger.error('Erreur lors du renouvellement du token:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
};

module.exports = {
    authManager,
    requireAuth,
    refreshToken
};