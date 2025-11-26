/**
 * Script pour initialiser la configuration email dans la base de données
 */

require('dotenv').config();
const database = require('../config/database');
const logger = require('../utils/logger');

async function initEmailConfig() {
    try {
        logger.info('Initialisation de la configuration email...');

        await database.init();

        // Configurations à insérer
        const configs = [
            { key: 'email_smtp_host', value: 'smtp.gmail.com', description: 'Serveur SMTP pour l\'envoi d\'emails', encrypted: false },
            { key: 'email_smtp_port', value: '587', description: 'Port SMTP (587 pour TLS, 465 pour SSL)', encrypted: false },
            { key: 'email_smtp_secure', value: 'false', description: 'Utiliser SSL (true) ou TLS (false)', encrypted: false },
            { key: 'email_smtp_user', value: '', description: 'Adresse email de l\'expéditeur (compte Gmail)', encrypted: false },
            { key: 'email_smtp_password', value: '', description: 'Mot de passe d\'application Gmail (chiffré)', encrypted: true },
            { key: 'email_from_name', value: 'Club Tir à l\'Arc', description: 'Nom affiché comme expéditeur', encrypted: false },
            { key: 'email_from_address', value: '', description: 'Adresse email expéditeur', encrypted: false },
            { key: 'email_incidents_to', value: '', description: 'Adresse email pour recevoir les notifications d\'incidents', encrypted: false },
            { key: 'email_incidents_cc', value: '', description: 'Adresse email en copie (CC) - optionnel', encrypted: false },
            { key: 'email_enabled', value: 'false', description: 'Activer ou désactiver l\'envoi d\'emails', encrypted: false },
            { key: 'email_last_test_success', value: null, description: 'Date et heure du dernier test email réussi', encrypted: false },
            { key: 'email_last_send_success', value: null, description: 'Date et heure du dernier envoi email réussi', encrypted: false }
        ];

        let inserted = 0;
        let skipped = 0;

        for (const config of configs) {
            try {
                await database.query(`
                    INSERT INTO configuration (key, value, description, is_encrypted)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (key) DO NOTHING
                `, [config.key, config.value, config.description, config.encrypted]);

                // Vérifier si l'insertion a réussi
                const result = await database.query(
                    'SELECT key FROM configuration WHERE key = $1',
                    [config.key]
                );

                if (result.rows.length > 0) {
                    logger.info(`✓ Configuration ajoutée: ${config.key}`);
                    inserted++;
                } else {
                    logger.info(`- Configuration existante: ${config.key}`);
                    skipped++;
                }
            } catch (error) {
                logger.error(`Erreur lors de l'insertion de ${config.key}:`, error);
            }
        }

        logger.info('\n='.repeat(60));
        logger.info('Configuration email initialisée avec succès !');
        logger.info(`- Configurations ajoutées: ${inserted}`);
        logger.info(`- Configurations existantes (ignorées): ${skipped}`);
        logger.info('='.repeat(60));
        logger.info('\nPour configurer l\'envoi d\'emails :');
        logger.info('1. Connectez-vous à l\'interface d\'administration');
        logger.info('2. Allez dans l\'onglet Configuration');
        logger.info('3. Cliquez sur "Configurer l\'envoi d\'emails"');
        logger.info('4. Remplissez les paramètres Gmail et testez la configuration');
        logger.info('='.repeat(60));

        process.exit(0);

    } catch (error) {
        logger.error('Erreur lors de l\'initialisation de la configuration email:', error);
        process.exit(1);
    }
}

// Exécuter le script
initEmailConfig();
