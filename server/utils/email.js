/**
 * Service d'envoi d'emails avec Nodemailer
 * Configuration pour incidents et notifications
 * Lit la configuration depuis la base de données
 */

const nodemailer = require('nodemailer');
const logger = require('./logger');
const database = require('../config/database');
const { decrypt, isEncrypted } = require('./encryption');

// Cache du transporteur pour éviter de le recréer à chaque envoi
let transporter = null;
let lastConfigUpdate = null;

/**
 * Récupérer la configuration email depuis la base de données
 */
async function getEmailConfig() {
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
            'email_enabled'
        ];

        const result = await database.query(`
            SELECT key, value, is_encrypted, updated_at
            FROM configuration
            WHERE key = ANY($1)
        `, [configKeys]);

        if (result.rows.length === 0) {
            return null;
        }

        const config = {};
        let latestUpdate = null;

        result.rows.forEach(row => {
            const shortKey = row.key.replace('email_', '');

            // Suivre la dernière mise à jour
            if (!latestUpdate || new Date(row.updated_at) > new Date(latestUpdate)) {
                latestUpdate = row.updated_at;
            }

            // Déchiffrer les valeurs chiffrées
            if (row.is_encrypted && row.value) {
                try {
                    config[shortKey] = decrypt(row.value);
                } catch (error) {
                    logger.error(`Erreur déchiffrement ${row.key}:`, error);
                    config[shortKey] = null;
                }
            } else {
                // Convertir les types
                if (row.key === 'email_smtp_port') {
                    config[shortKey] = parseInt(row.value) || 587;
                } else if (row.key === 'email_smtp_secure' || row.key === 'email_enabled') {
                    config[shortKey] = row.value === 'true';
                } else {
                    config[shortKey] = row.value || '';
                }
            }
        });

        config.last_update = latestUpdate;

        // Vérifier que la configuration est complète
        if (!config.smtp_host || !config.smtp_user || !config.smtp_password) {
            logger.warn('Configuration email incomplète dans la base de données');
            return null;
        }

        return config;

    } catch (error) {
        logger.error('Erreur lors de la récupération de la configuration email:', error);
        return null;
    }
}

/**
 * Initialiser ou réinitialiser le transporteur email
 */
async function initTransporter(forceRefresh = false) {
    try {
        // Récupérer la configuration depuis la BDD
        const config = await getEmailConfig();

        // Si pas de config ou email désactivé, utiliser mode fallback
        if (!config || !config.enabled) {
            // Vérifier si on a une config .env en fallback
            if (process.env.SMTP_HOST && process.env.SMTP_USER) {
                logger.info('Utilisation de la configuration email depuis .env (fallback)');
                return initTransporterFromEnv();
            }

            logger.warn('Aucune configuration email disponible, mode simulation');
            return null;
        }

        // Vérifier si on doit rafraîchir le transporteur
        const configUpdated = !lastConfigUpdate ||
                             new Date(config.last_update) > new Date(lastConfigUpdate);

        if (transporter && !forceRefresh && !configUpdated) {
            return transporter;
        }

        // Créer le transporteur avec la config de la BDD
        transporter = nodemailer.createTransport({
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_secure,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_password
            },
            // Options de timeout
            connectionTimeout: 30000,
            greetingTimeout: 30000
        });

        lastConfigUpdate = config.last_update;

        logger.info('Transporteur email configuré depuis BDD', {
            host: config.smtp_host,
            port: config.smtp_port,
            user: config.smtp_user
        });

        // Vérifier la connexion
        await transporter.verify();
        logger.info('Connexion SMTP vérifiée avec succès');

        return transporter;

    } catch (error) {
        logger.error('Erreur lors de l\'initialisation du transporteur email:', error);

        // En cas d'erreur, essayer le fallback .env
        if (process.env.SMTP_HOST) {
            logger.warn('Échec config BDD, tentative avec .env');
            return initTransporterFromEnv();
        }

        return null;
    }
}

/**
 * Initialiser le transporteur depuis les variables d'environnement (fallback)
 */
async function initTransporterFromEnv() {
    try {
        if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
            // Si aucune config .env, utiliser Ethereal pour le développement
            if (process.env.NODE_ENV !== 'production') {
                const testAccount = await nodemailer.createTestAccount();
                transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });

                logger.info('Transporteur email configuré (Ethereal - test)', {
                    user: testAccount.user
                });

                return transporter;
            }

            return null;
        }

        // Configuration depuis .env
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS
            }
        });

        logger.info('Transporteur email configuré depuis .env');
        return transporter;

    } catch (error) {
        logger.error('Erreur initialisation transporteur depuis .env:', error);
        return null;
    }
}

/**
 * Envoyer un email de notification d'incident
 */
async function sendIncidentNotification(incident) {
    try {
        // Récupérer la configuration email
        const config = await getEmailConfig();

        if (!config || !config.enabled) {
            logger.warn('Envoi email désactivé ou non configuré', {
                incidentId: incident.id
            });
            return { success: false, reason: 'disabled' };
        }

        // Initialiser le transporteur
        await initTransporter();

        if (!transporter) {
            logger.warn('Pas de transporteur email disponible', {
                incidentId: incident.id
            });
            return { success: false, reason: 'no_transporter' };
        }

        // Composer l'adresse "From"
        const fromAddress = config.from_name
            ? `"${config.from_name}" <${config.from_address}>`
            : config.from_address;

        // Préparer les destinataires
        const recipients = config.incidents_to;
        const cc = config.incidents_cc && config.incidents_cc.trim() !== '' ? config.incidents_cc : undefined;

        const mailOptions = {
            from: fromAddress,
            to: recipients,
            subject: `[INCIDENT] ${incident.type_incident} - Terrain ${incident.terrain}`,
            text: `
NOUVEAU SIGNALEMENT D'INCIDENT

Type d'incident: ${incident.type_incident}
Terrain: ${incident.terrain === 'interieur' ? 'Intérieur' : 'Extérieur'}
Date: ${new Date(incident.date_incident).toLocaleString('fr-FR')}

Description:
${incident.description}

${incident.photo_path ? `Photo jointe disponible à: ${incident.photo_path}` : 'Aucune photo jointe'}

---
ID incident: ${incident.id}
Signalement automatique du système de gestion des terrains de tir à l'arc

Pour consulter et gérer cet incident, connectez-vous à l'interface d'administration.
            `.trim(),
            html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2E7D32; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
        .incident-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #FF6F00; }
        .footer { background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #666; }
        .label { font-weight: bold; color: #2E7D32; }
        .photo { margin: 15px 0; }
        .photo img { max-width: 100%; border-radius: 5px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">🎯 Nouveau Signalement d'Incident</h2>
        </div>
        <div class="content">
            <div class="incident-details">
                <p><span class="label">Type d'incident:</span> ${incident.type_incident}</p>
                <p><span class="label">Terrain:</span> ${incident.terrain === 'interieur' ? 'Intérieur 🏟️' : 'Extérieur 🌳'}</p>
                <p><span class="label">Date:</span> ${new Date(incident.date_incident).toLocaleString('fr-FR')}</p>
                <p><span class="label">Statut:</span> En attente de traitement</p>
            </div>

            <h3>Description:</h3>
            <div style="background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
                ${incident.description.replace(/\n/g, '<br>')}
            </div>

            ${incident.photo_path ? `
            <div class="photo">
                <p><span class="label">📸 Photo jointe:</span></p>
                <p><em>Photo disponible dans l'interface d'administration: ${incident.photo_path}</em></p>
            </div>
            ` : '<p style="color: #666;"><em>Aucune photo jointe</em></p>'}
        </div>
        <div class="footer">
            <p>ID incident: ${incident.id}</p>
            <p>Signalement automatique du système de gestion des terrains de tir à l'arc</p>
            <p>Pour consulter et gérer cet incident, connectez-vous à l'interface d'administration.</p>
        </div>
    </div>
</body>
</html>
            `.trim()
        };

        // Ajouter le CC seulement s'il est défini
        if (cc) {
            mailOptions.cc = cc;
        }

        const info = await transporter.sendMail(mailOptions);

        logger.info('Email d\'incident envoyé', {
            incidentId: incident.id,
            messageId: info.messageId,
            to: recipients,
            cc: cc,
            previewUrl: nodemailer.getTestMessageUrl(info)
        });

        // Mettre à jour la date du dernier envoi réussi
        try {
            await database.query(`
                INSERT INTO configuration (key, value, description)
                VALUES ('email_last_send_success', $1, 'Dernier envoi email réussi')
                ON CONFLICT (key)
                DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            `, [new Date().toISOString()]);
        } catch (dbError) {
            logger.warn('Impossible de mettre à jour email_last_send_success:', dbError);
        }

        return {
            success: true,
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info)
        };

    } catch (error) {
        logger.error('Erreur lors de l\'envoi de l\'email d\'incident:', error);

        // Ne pas faire échouer la création d'incident si l'email échoue
        return { success: false, error: error.message };
    }
}

/**
 * Envoyer un email de test
 */
async function sendTestEmail(to) {
    try {
        const config = await getEmailConfig();

        if (!config) {
            return { success: false, error: 'Configuration email non disponible' };
        }

        await initTransporter();

        if (!transporter) {
            return { success: false, error: 'Pas de transporteur email configuré' };
        }

        const fromAddress = config.from_name
            ? `"${config.from_name}" <${config.from_address}>`
            : config.from_address;

        const mailOptions = {
            from: fromAddress,
            to: to,
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
                        Configuration : ${config.smtp_host}:${config.smtp_port}
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);

        logger.info('Email de test envoyé', {
            messageId: info.messageId,
            to: to,
            previewUrl: nodemailer.getTestMessageUrl(info)
        });

        // Mettre à jour la date du dernier test réussi
        try {
            await database.query(`
                INSERT INTO configuration (key, value, description)
                VALUES ('email_last_test_success', $1, 'Dernier test email réussi')
                ON CONFLICT (key)
                DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
            `, [new Date().toISOString()]);
        } catch (dbError) {
            logger.warn('Impossible de mettre à jour email_last_test_success:', dbError);
        }

        return {
            success: true,
            messageId: info.messageId,
            previewUrl: nodemailer.getTestMessageUrl(info)
        };

    } catch (error) {
        logger.error('Erreur lors de l\'envoi de l\'email de test:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendIncidentNotification,
    sendTestEmail,
    initTransporter,
    getEmailConfig
};
