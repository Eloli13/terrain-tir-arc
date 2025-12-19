#!/usr/bin/env node

/**
 * Script d'initialisation de la base de données
 * Crée les tables et un compte administrateur par défaut
 * Usage: node server/scripts/init-db.js
 */

require('dotenv').config();
const database = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Configuration de l'admin par défaut
const DEFAULT_ADMIN = {
    username: 'admin',
    email: 'admin@localhost',
    password: 'changez-moi-en-production' // DOIT être changé au premier login
};

async function createDefaultAdmin() {
    try {
        // Vérifier si un admin existe déjà
        const existingAdmins = await database.query(
            'SELECT COUNT(*) as count FROM admin_users'
        );

        if (existingAdmins.rows[0].count > 0) {
            console.log('ℹ️  Des comptes administrateurs existent déjà, aucun compte créé');
            return;
        }

        // Générer le sel et hasher le mot de passe (même méthode que database.js)
        const salt = crypto.randomBytes(16).toString('hex');
        const saltedPassword = DEFAULT_ADMIN.password + salt;
        const passwordHash = await bcrypt.hash(saltedPassword, 12);

        // Créer l'admin par défaut
        await database.query(`
            INSERT INTO admin_users (username, email, password_hash, salt, is_active, must_change_password)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [
            DEFAULT_ADMIN.username,
            DEFAULT_ADMIN.email,
            passwordHash,
            salt,
            true,
            true // Force le changement de mot de passe
        ]);

        console.log('\n✅ Compte administrateur par défaut créé:');
        console.log(`   Username: ${DEFAULT_ADMIN.username}`);
        console.log(`   Email: ${DEFAULT_ADMIN.email}`);
        console.log(`   Password: ${DEFAULT_ADMIN.password}`);
        console.log('\n⚠️  IMPORTANT: Ce mot de passe DOIT être changé lors de la première connexion!\n');

    } catch (error) {
        console.error('❌ Erreur lors de la création de l\'admin:', error.message);
        throw error;
    }
}

async function initializeDatabase() {
    try {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║     🗄️  INITIALISATION DE LA BASE DE DONNÉES                 ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        console.log(`📊 Base de données: ${process.env.DB_NAME || 'terrain_tir_arc'}`);
        console.log(`🖥️  Hôte: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}`);
        console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}\n`);

        // 1. Initialiser les tables via le module database
        console.log('🔄 Création des tables et indexes...\n');
        await database.init();
        console.log('✅ Tables créées avec succès\n');

        // 2. Créer l'admin par défaut
        console.log('👤 Création du compte administrateur...\n');
        await createDefaultAdmin();

        // 3. Insérer les configurations par défaut
        console.log('⚙️  Création des configurations par défaut...\n');
        await createDefaultConfig();

        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║     ✅ INITIALISATION TERMINÉE AVEC SUCCÈS                    ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        console.log('💡 Prochaines étapes:');
        console.log('   1. Démarrez le serveur: npm start');
        console.log('   2. Connectez-vous avec le compte admin par défaut');
        console.log('   3. Changez le mot de passe administrateur');
        console.log('   4. Configurez les paramètres SMTP (optionnel)\n');

    } catch (error) {
        console.error('\n❌ ERREUR lors de l\'initialisation:', error.message);
        console.error('\nStack trace:', error.stack);
        throw error;
    }
}

async function createDefaultConfig() {
    try {
        // Configurations par défaut à insérer
        const defaultConfigs = [
            {
                key: 'telephone_responsable',
                value: '0601020304',
                description: 'Numéro de téléphone du responsable du club'
            },
            {
                key: 'email_incidents',
                value: 'incidents@club-tir-arc.fr',
                description: 'Email pour recevoir les notifications d\'incidents'
            },
            {
                key: 'qr_code_data',
                value: 'https://votre-domaine.com',
                description: 'URL du QR code pour l\'accès rapide'
            },
            {
                key: 'max_sessions_per_terrain',
                value: '5',
                description: 'Nombre maximum de sessions simultanées par terrain'
            }
        ];

        for (const config of defaultConfigs) {
            // Vérifier si la config existe déjà
            const existing = await database.query(
                'SELECT id FROM configuration WHERE key = $1',
                [config.key]
            );

            if (existing.rows.length === 0) {
                await database.query(`
                    INSERT INTO configuration (key, value, description, is_encrypted)
                    VALUES ($1, $2, $3, $4)
                `, [config.key, config.value, config.description, false]);

                console.log(`   ✓ Configuration "${config.key}" créée`);
            }
        }

        console.log('');
    } catch (error) {
        console.error('❌ Erreur lors de la création des configurations:', error.message);
        throw error;
    }
}

async function main() {
    try {
        await initializeDatabase();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ ERREUR FATALE:', error.message);
        console.error('\nVérifiez:');
        console.error('  - Les variables d\'environnement (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)');
        console.error('  - Que la base de données est accessible');
        console.error('  - Que l\'utilisateur a les droits nécessaires\n');
        process.exit(1);
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    main();
}

module.exports = { initializeDatabase, createDefaultAdmin };
