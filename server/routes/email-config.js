const express = require('express');
const Joi = require('joi');
const { requireAuth } = require('../middleware/auth');
const database = require('../config/database');
const logger = require('../utils/logger');
const { encrypt, decrypt, isEncrypted } = require('../utils/encryption');
const { sendTestEmail } = require('../utils/email');

const router = express.Router();

// Schémas de validation Joi pour la configuration email
const emailConfigSchema = Joi.object({
    smtp_host: Joi.string().hostname().required().messages({
        'string.hostname': 'Le serveur SMTP doit être un nom d\'hôte valide',
        'any.required': 'Le serveur SMTP est requis'
    }),
    smtp_port: Joi.number().integer().min(1).max(65535).required().messages({
        'number.base': 'Le port SMTP doit être un nombre',
        'number.min': 'Le port SMTP doit être entre 1 et 65535',
        'number.max': 'Le port SMTP doit être entre 1 et 65535',
        'any.required': 'Le port SMTP est requis'
    }),
    smtp_secure: Joi.boolean().required(),
    smtp_user: Joi.string().email().required().messages({
        'string.email': 'L\'email utilisateur SMTP doit être valide',
        'any.required': 'L\'email utilisateur SMTP est requis'
    }),
    smtp_password: Joi.string().min(8).max(256).required().messages({
        'string.min': 'Le mot de passe SMTP doit contenir au moins 8 caractères',
        'any.required': 'Le mot de passe SMTP est requis'
    }),
    email_from_name: Joi.string().max(100).allow('').optional(),
    email_from_address: Joi.string().email().required().messages({
        'string.email': 'L\'adresse email expéditeur doit être valide',
        'any.required': 'L\'adresse email expéditeur est requise'
    }),
    email_incidents_to: Joi.string().email().required().messages({
        'string.email': 'L\'adresse email destinataire doit être valide',
        'any.required': 'L\'adresse email destinataire est requise'
    }),
    email_incidents_cc: Joi.string().email().allow('', null).optional().messages({
        'string.email': 'L\'adresse email CC doit être valide'
    }),
    email_enabled: Joi.boolean().required()
});

const emailTestSchema = Joi.object({
    smtp_host: Joi.string().hostname().required(),
    smtp_port: Joi.number().integer().min(1).max(65535).required(),
    smtp_secure: Joi.boolean().required(),
    smtp_user: Joi.string().email().required(),
    smtp_password: Joi.string().min(8).required(),
    email_from: Joi.string().required(),
    test_recipient: Joi.string().email().required().messages({
        'string.email': 'L\'adresse email de test doit être valide',
        'any.required': 'L\'adresse email de test est requise'
    }),
    test_recipient_cc: Joi.string().email().optional().allow('').messages({
        'string.email': 'L\'adresse email CC doit être valide'
    })
});

/**
 * Middleware de validation pour les routes email
 */
function validateEmailConfig(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                error: 'Validation échouée',
                details: errors
            });
        }

        req.body = value;
        next();
    };
}

/**
 * GET /api/email-config
 * Récupérer la configuration email actuelle
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const configKeys = [
            'email_smtp_host',
            'email_smtp_port',
            'email_smtp_secure',
            'email_smtp_user',
            'email_smtp_password',
            'email_from_name',
            'email_from_address',
            'email_incidents_to',
            'email_incidents_cc',
            'email_enabled',
            'email_last_test_success'
        ];

        const result = await database.query(`
            SELECT key, value, is_encrypted
            FROM configuration
            WHERE key = ANY($1)
        `, [configKeys]);

        const config = {};
        let passwordSet = false;

        result.rows.forEach(row => {
            const shortKey = row.key.replace('email_', '');

            if (row.key === 'email_smtp_password') {
                // Ne jamais renvoyer le mot de passe, juste indiquer s'il existe
                passwordSet = !!row.value;
            } else {
                // Convertir les valeurs selon leur type
                if (row.key === 'email_smtp_port') {
                    config[shortKey] = parseInt(row.value) || 587;
                } else if (row.key === 'email_smtp_secure' || row.key === 'email_enabled') {
                    config[shortKey] = row.value === 'true';
                } else {
                    config[shortKey] = row.value || '';
                }
            }
        });

        // Ajouter le statut du mot de passe
        config.smtp_password_set = passwordSet;

        // Déterminer le statut de la configuration
        const configured = passwordSet && config.smtp_user && config.smtp_host;
        const tested = !!config.last_test_success && config.last_test_success !== 'true';

        res.json({
            configuration: config,
            status: {
                configured,
                tested,
                last_test: tested ? config.last_test_success : null
            }
        });

    } catch (error) {
        logger.error('Erreur lors de la récupération de la configuration email:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * POST /api/email-config/test
 * Tester la configuration email (ne sauvegarde pas)
 */
router.post('/test', requireAuth, validateEmailConfig(emailTestSchema), async (req, res) => {
    try {
        const {
            smtp_host,
            smtp_port,
            smtp_secure,
            smtp_user,
            smtp_password,
            email_from,
            test_recipient,
            test_recipient_cc
        } = req.body;

        logger.info('Test de configuration email demandé', {
            smtp_host,
            smtp_user,
            test_recipient,
            test_recipient_cc,
            userId: req.user.id
        });

        // Créer un transporteur temporaire avec les paramètres fournis
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
            host: smtp_host,
            port: smtp_port,
            secure: smtp_secure,
            auth: {
                user: smtp_user,
                pass: smtp_password
            },
            // Timeout de 30 secondes
            connectionTimeout: 30000,
            greetingTimeout: 30000
        });

        // Vérifier la connexion
        await transporter.verify();

        // Envoyer un email de test
        const mailOptions = {
            from: email_from,
            to: test_recipient,
            subject: 'Test - Configuration Email Terrain Tir Arc',
            text: `Ceci est un email de test envoyé le ${new Date().toLocaleString('fr-FR')}.\n\nSi vous recevez cet email, la configuration fonctionne correctement. ✅`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="color: #2E7D32;">✅ Test de Configuration Email</h2>
                    <p>Ceci est un email de test envoyé le <strong>${new Date().toLocaleString('fr-FR')}</strong>.</p>
                    <p>Si vous recevez cet email, la configuration fonctionne correctement.</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666;">
                        Application de gestion des terrains de tir à l'arc<br>
                        Envoyé depuis : ${smtp_host}:${smtp_port}
                    </p>
                </div>
            `
        };

        // Ajouter le CC seulement s'il est défini
        if (test_recipient_cc && test_recipient_cc.trim() !== '') {
            mailOptions.cc = test_recipient_cc;
        }

        const info = await transporter.sendMail(mailOptions);

        logger.info('Email de test envoyé avec succès', {
            messageId: info.messageId,
            userId: req.user.id
        });

        logger.security('Test email configuration réussi', {
            smtp_host,
            smtp_user,
            test_recipient,
            userId: req.user.id,
            ip: req.ip
        });

        // Enregistrer la date du test réussi
        const testDate = new Date().toISOString();
        await database.query(`
            INSERT INTO configuration (key, value, is_encrypted, updated_at)
            VALUES ('email_last_test_success', $1, false, NOW())
            ON CONFLICT (key)
            DO UPDATE SET value = $1, updated_at = NOW()
        `, [testDate]);

        res.json({
            success: true,
            message: 'Email de test envoyé avec succès',
            details: {
                messageId: info.messageId,
                timestamp: new Date().toISOString(),
                recipient: test_recipient,
                previewUrl: nodemailer.getTestMessageUrl(info) // null en production, URL en dev
            }
        });

    } catch (error) {
        logger.error('Erreur lors du test de configuration email:', error);

        // Identifier le type d'erreur pour donner des suggestions
        let errorType = 'unknown';
        let suggestions = [];
        let helpLink = null;

        if (error.code === 'EAUTH' || error.responseCode === 535) {
            errorType = 'authentication';
            suggestions = [
                'Vérifiez que l\'authentification à 2 facteurs est activée',
                'Créez un nouveau mot de passe d\'application Gmail',
                'Vérifiez que le compte Gmail est actif'
            ];
            helpLink = 'https://support.google.com/accounts/answer/185833';
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
            errorType = 'connection';
            suggestions = [
                'Vérifiez votre connexion internet',
                'Vérifiez que le serveur SMTP est accessible',
                'Essayez avec un port différent (587 ou 465)'
            ];
        } else if (error.code === 'ESOCKET') {
            errorType = 'network';
            suggestions = [
                'Le serveur SMTP peut être bloqué par un pare-feu',
                'Vérifiez les paramètres réseau du serveur'
            ];
        }

        res.status(400).json({
            success: false,
            error: error.message || 'Erreur lors du test d\'envoi',
            errorType,
            errorCode: error.code,
            suggestions,
            helpLink
        });
    }
});

/**
 * PUT /api/email-config
 * Enregistrer la configuration email
 */
router.put('/', requireAuth, validateEmailConfig(emailConfigSchema), async (req, res) => {
    try {
        const {
            smtp_host,
            smtp_port,
            smtp_secure,
            smtp_user,
            smtp_password,
            email_from_name,
            email_from_address,
            email_incidents_to,
            email_incidents_cc,
            email_enabled
        } = req.body;

        // Chiffrer le mot de passe SMTP
        const encryptedPassword = encrypt(smtp_password);

        await database.transaction(async (client) => {
            // Préparer les configurations à sauvegarder
            const configs = [
                { key: 'email_smtp_host', value: smtp_host, encrypted: false },
                { key: 'email_smtp_port', value: smtp_port.toString(), encrypted: false },
                { key: 'email_smtp_secure', value: smtp_secure.toString(), encrypted: false },
                { key: 'email_smtp_user', value: smtp_user, encrypted: false },
                { key: 'email_smtp_password', value: encryptedPassword, encrypted: true },
                { key: 'email_from_name', value: email_from_name || '', encrypted: false },
                { key: 'email_from_address', value: email_from_address, encrypted: false },
                { key: 'email_incidents_to', value: email_incidents_to, encrypted: false },
                { key: 'email_incidents_cc', value: email_incidents_cc || '', encrypted: false },
                { key: 'email_enabled', value: email_enabled.toString(), encrypted: false }
            ];

            // Sauvegarder chaque configuration
            for (const config of configs) {
                await client.query(`
                    INSERT INTO configuration (key, value, is_encrypted, description)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (key)
                    DO UPDATE SET
                        value = EXCLUDED.value,
                        is_encrypted = EXCLUDED.is_encrypted,
                        updated_at = NOW()
                `, [
                    config.key,
                    config.value,
                    config.encrypted,
                    `Configuration email - ${config.key.replace('email_', '')}`
                ]);
            }

            // Enregistrer dans l'audit log
            await client.query(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, new_values, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                req.user.id,
                'UPDATE',
                'EMAIL_CONFIGURATION',
                null,
                JSON.stringify({
                    smtp_host,
                    smtp_user,
                    email_from: `${email_from_name} <${email_from_address}>`,
                    email_to: email_incidents_to,
                    enabled: email_enabled
                }),
                req.ip,
                req.get('User-Agent')
            ]);
        });

        logger.info('Configuration email mise à jour', {
            smtp_host,
            smtp_user,
            email_enabled,
            updatedBy: req.user.id
        });

        logger.security('Configuration email modifiée', {
            userId: req.user.id,
            smtp_host,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Configuration email enregistrée avec succès',
            configuration: {
                smtp_host,
                smtp_user,
                email_from: email_from_name ? `${email_from_name} <${email_from_address}>` : email_from_address,
                email_to: email_incidents_to,
                email_cc: email_incidents_cc,
                enabled: email_enabled
            }
        });

    } catch (error) {
        logger.error('Erreur lors de l\'enregistrement de la configuration email:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

/**
 * DELETE /api/email-config
 * Supprimer la configuration email (désactiver)
 */
router.delete('/', requireAuth, async (req, res) => {
    try {
        await database.transaction(async (client) => {
            // Désactiver l'envoi d'emails
            await client.query(`
                UPDATE configuration
                SET value = 'false', updated_at = NOW()
                WHERE key = 'email_enabled'
            `);

            // Enregistrer dans l'audit log
            await client.query(`
                INSERT INTO audit_logs (user_id, action, resource, resource_id, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                req.user.id,
                'DISABLE',
                'EMAIL_CONFIGURATION',
                null,
                req.ip,
                req.get('User-Agent')
            ]);
        });

        logger.info('Configuration email désactivée', { userId: req.user.id });

        logger.security('Email notifications désactivées', {
            userId: req.user.id,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Notifications par email désactivées'
        });

    } catch (error) {
        logger.error('Erreur lors de la désactivation de la configuration email:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;
